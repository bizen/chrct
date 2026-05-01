import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const kindValidator = v.union(v.literal("main"), v.literal("tanomi"));

export const list = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();

        return tasks.sort((a, b) => a.order - b.order);
    },
});

export const create = mutation({
    args: {
        text: v.string(),
        kind: v.optional(kindValidator),
    },
    handler: async (ctx, { text, kind }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const existing = await ctx.db
            .query("tasks")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
        const maxOrder = existing.reduce((m, t) => Math.max(m, t.order), -1);

        return await ctx.db.insert("tasks", {
            userId: identity.subject,
            text,
            done: false,
            order: maxOrder + 1,
            createdAt: Date.now(),
            kind,
        });
    },
});

export const toggle = mutation({
    args: { id: v.id("tasks") },
    handler: async (ctx, { id }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const task = await ctx.db.get(id);
        if (!task || task.userId !== identity.subject) {
            throw new Error("Not found");
        }

        await ctx.db.patch(id, { done: !task.done });
    },
});

export const updateText = mutation({
    args: { id: v.id("tasks"), text: v.string() },
    handler: async (ctx, { id, text }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const task = await ctx.db.get(id);
        if (!task || task.userId !== identity.subject) {
            throw new Error("Not found");
        }

        await ctx.db.patch(id, { text });
    },
});

export const reorder = mutation({
    args: {
        orderedIds: v.array(v.id("tasks")),
    },
    handler: async (ctx, { orderedIds }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        for (let i = 0; i < orderedIds.length; i++) {
            const t = await ctx.db.get(orderedIds[i]);
            if (!t || t.userId !== identity.subject) continue;
            if (t.order !== i) {
                await ctx.db.patch(orderedIds[i], { order: i });
            }
        }
    },
});

export const setKind = mutation({
    args: {
        id: v.id("tasks"),
        kind: v.optional(kindValidator),
    },
    handler: async (ctx, { id, kind }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const task = await ctx.db.get(id);
        if (!task || task.userId !== identity.subject) {
            throw new Error("Not found");
        }

        await ctx.db.patch(id, { kind });
    },
});

export const remove = mutation({
    args: { id: v.id("tasks") },
    handler: async (ctx, { id }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const task = await ctx.db.get(id);
        if (!task || task.userId !== identity.subject) {
            throw new Error("Not found");
        }

        await ctx.db.delete(id);
    },
});

export const clearCompleted = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();

        for (const t of tasks) {
            if (t.done) await ctx.db.delete(t._id);
        }
    },
});
