import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

const kindValidator = v.union(v.literal("main"), v.literal("tanomi"));

type ListRow =
    | { kind: "task"; entryId: Id<"taskListEntries">; task: Doc<"tasks"> }
    | { kind: "section"; entryId: Id<"taskListEntries">; sectionTitle: string };

function readLegacyOrder(t: Doc<"tasks"> & { order?: number }): number {
    return typeof t.order === "number" ? t.order : 0;
}

export const list = query({
    args: {},
    handler: async (ctx): Promise<ListRow[]> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const entries = await ctx.db
            .query("taskListEntries")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();

        entries.sort((a, b) => a.order - b.order);

        const rows: ListRow[] = [];
        for (const e of entries) {
            if (e.kind === "section") {
                rows.push({
                    kind: "section",
                    entryId: e._id,
                    sectionTitle: e.sectionTitle?.trim() ? e.sectionTitle : "見出し",
                });
                continue;
            }
            if (e.kind === "task" && e.taskId) {
                const task = await ctx.db.get(e.taskId);
                if (task && task.userId === identity.subject) {
                    rows.push({ kind: "task", entryId: e._id, task });
                }
            }
        }
        return rows;
    },
});

/** 既存タスクだけあってリスト行が無いとき、1回だけエントリを自動生成 */
export const bootstrapIfNeeded = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const existing = await ctx.db
            .query("taskListEntries")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
        if (existing.length > 0) return;

        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
        if (tasks.length === 0) return;

        const sorted = [...tasks].sort((a, b) => {
            const ao = readLegacyOrder(a as Doc<"tasks"> & { order?: number });
            const bo = readLegacyOrder(b as Doc<"tasks"> & { order?: number });
            if (ao !== bo) return ao - bo;
            return a._creationTime - b._creationTime;
        });

        let order = 0;
        for (const t of sorted) {
            await ctx.db.insert("taskListEntries", {
                userId: identity.subject,
                order: order++,
                kind: "task",
                taskId: t._id,
            });
        }
    },
});

export const addTask = mutation({
    args: {
        text: v.string(),
        kind: v.optional(kindValidator),
    },
    handler: async (ctx, { text, kind }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const entries = await ctx.db
            .query("taskListEntries")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
        const maxOrder = entries.reduce((m, e) => Math.max(m, e.order), -1);

        const taskId = await ctx.db.insert("tasks", {
            userId: identity.subject,
            text,
            done: false,
            createdAt: Date.now(),
            kind,
        });

        await ctx.db.insert("taskListEntries", {
            userId: identity.subject,
            order: maxOrder + 1,
            kind: "task",
            taskId,
        });

        return taskId;
    },
});

export const addSection = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const entries = await ctx.db
            .query("taskListEntries")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
        const maxOrder = entries.reduce((m, e) => Math.max(m, e.order), -1);

        await ctx.db.insert("taskListEntries", {
            userId: identity.subject,
            order: maxOrder + 1,
            kind: "section",
            sectionTitle: "見出し",
        });
    },
});

export const reorderEntries = mutation({
    args: { orderedEntryIds: v.array(v.id("taskListEntries")) },
    handler: async (ctx, { orderedEntryIds }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const seen = new Set<string>();
        for (let i = 0; i < orderedEntryIds.length; i++) {
            const id = orderedEntryIds[i];
            if (seen.has(id)) throw new Error("Invalid ordering");
            seen.add(id);

            const e = await ctx.db.get(id);
            if (!e || e.userId !== identity.subject) throw new Error("Not found");
            if (e.order !== i) {
                await ctx.db.patch(id, { order: i });
            }
        }
    },
});

export const updateSectionTitle = mutation({
    args: {
        entryId: v.id("taskListEntries"),
        title: v.string(),
    },
    handler: async (ctx, { entryId, title }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const e = await ctx.db.get(entryId);
        if (!e || e.userId !== identity.subject || e.kind !== "section") {
            throw new Error("Not found");
        }
        const trimmed = title.trim();
        if (!trimmed) throw new Error("Title required");
        await ctx.db.patch(entryId, { sectionTitle: trimmed });
    },
});

export const removeEntry = mutation({
    args: { entryId: v.id("taskListEntries") },
    handler: async (ctx, { entryId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const e = await ctx.db.get(entryId);
        if (!e || e.userId !== identity.subject) throw new Error("Not found");

        if (e.kind === "task" && e.taskId) {
            await ctx.db.delete(e.taskId);
        }
        await ctx.db.delete(entryId);

        const rest = await ctx.db
            .query("taskListEntries")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
        rest.sort((a, b) => a.order - b.order);
        for (let i = 0; i < rest.length; i++) {
            if (rest[i].order !== i) {
                await ctx.db.patch(rest[i]._id, { order: i });
            }
        }
    },
});

export const clearCompleted = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const entries = await ctx.db
            .query("taskListEntries")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();

        for (const e of entries) {
            if (e.kind !== "task" || !e.taskId) continue;
            const task = await ctx.db.get(e.taskId);
            if (task?.done) {
                await ctx.db.delete(e.taskId);
                await ctx.db.delete(e._id);
            }
        }

        const rest = await ctx.db
            .query("taskListEntries")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
        rest.sort((a, b) => a.order - b.order);
        for (let i = 0; i < rest.length; i++) {
            if (rest[i].order !== i) {
                await ctx.db.patch(rest[i]._id, { order: i });
            }
        }
    },
});
