import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }
        const userId = identity.subject;

        const templates = await ctx.db
            .query("chainTemplates")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();

        return templates;
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        tasks: v.array(
            v.object({
                name: v.string(),
                duration: v.number(),
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated call to mutation");
        }
        const userId = identity.subject;

        const templateId = await ctx.db.insert("chainTemplates", {
            userId,
            name: args.name,
            tasks: args.tasks,
            createdAt: Date.now(),
        });

        return templateId;
    },
});

export const remove = mutation({
    args: { id: v.id("chainTemplates") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated call to mutation");
        }
        const userId = identity.subject;

        const existing = await ctx.db.get(args.id);
        if (!existing || existing.userId !== userId) {
            throw new Error("Not found or access denied");
        }

        await ctx.db.delete(args.id);
    },
});
