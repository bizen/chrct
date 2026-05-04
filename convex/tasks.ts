import { mutation } from "./_generated/server";
import { v } from "convex/values";

const kindValidator = v.union(v.literal("main"), v.literal("tanomi"));

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

export const updateSummary = mutation({
    args: { id: v.id("tasks"), summary: v.string() },
    handler: async (ctx, { id, summary }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const task = await ctx.db.get(id);
        if (!task || task.userId !== identity.subject) {
            throw new Error("Not found");
        }

        const trimmed = summary.trim();
        await ctx.db.patch(id, {
            ...(trimmed ? { summary: trimmed } : { summary: undefined }),
        });
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
