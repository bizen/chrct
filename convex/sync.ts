import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const syncItemValidator = v.object({
    itemId: v.string(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
    payload: v.string(),
});

/** サインイン中のユーザーのアイテムを全部返す。ローカルとは updatedAt で突き合わせる */
export const pull = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const rows = await ctx.db
            .query("syncItems")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();

        return rows.map((row) => ({
            itemId: row.itemId,
            updatedAt: row.updatedAt,
            deletedAt: row.deletedAt,
            payload: row.payload,
        }));
    },
});

/** ローカルで更新された分を送る。updatedAt が新しい方を採用する */
export const push = mutation({
    args: { items: v.array(syncItemValidator) },
    handler: async (ctx, { items }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        for (const item of items) {
            const existing = await ctx.db
                .query("syncItems")
                .withIndex("by_user_item", (q) =>
                    q.eq("userId", identity.subject).eq("itemId", item.itemId)
                )
                .unique();

            if (!existing) {
                await ctx.db.insert("syncItems", {
                    userId: identity.subject,
                    itemId: item.itemId,
                    updatedAt: item.updatedAt,
                    deletedAt: item.deletedAt,
                    payload: item.payload,
                });
                continue;
            }

            if (existing.updatedAt >= item.updatedAt) continue;

            await ctx.db.patch(existing._id, {
                updatedAt: item.updatedAt,
                deletedAt: item.deletedAt,
                payload: item.payload,
            });
        }

        return { ok: true };
    },
});

/**
 * 旧 tasks / taskListEntries を新しいツリーへ一度だけ移行する。
 * 旧「見出し」はそのままラベル（親ノード）になり、その下に並んでいたタスクが子になる。
 */
export const importLegacy = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const already = await ctx.db
            .query("syncItems")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .first();
        if (already) return { imported: 0 };

        const entries = await ctx.db
            .query("taskListEntries")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
        if (entries.length === 0) return { imported: 0 };

        entries.sort((a, b) => a.order - b.order);

        const now = Date.now();
        let rootOrder = 0;
        let childOrder = 0;
        let currentSectionId: string | null = null;
        let imported = 0;

        for (const entry of entries) {
            if (entry.kind === "section") {
                currentSectionId = entry._id;
                childOrder = 0;
                await ctx.db.insert("syncItems", {
                    userId: identity.subject,
                    itemId: entry._id,
                    updatedAt: now,
                    payload: JSON.stringify({
                        type: "section",
                        parentId: null,
                        order: rootOrder++,
                        text: entry.sectionTitle?.trim() || "ラベル",
                        done: false,
                        createdAt: entry._creationTime,
                    }),
                });
                imported += 1;
                continue;
            }

            if (!entry.taskId) continue;
            const task = await ctx.db.get(entry.taskId);
            if (!task || task.userId !== identity.subject) continue;

            await ctx.db.insert("syncItems", {
                userId: identity.subject,
                itemId: task._id,
                updatedAt: now,
                payload: JSON.stringify({
                    type: "task",
                    parentId: currentSectionId,
                    order: currentSectionId ? childOrder++ : rootOrder++,
                    text: task.text,
                    note: task.summary?.trim() || undefined,
                    done: task.done,
                    kind: task.kind,
                    assignedDate: task.assignedDate,
                    createdAt: task.createdAt,
                }),
            });
            imported += 1;
        }

        return { imported };
    },
});
