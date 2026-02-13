import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const getUser = async (ctx: any) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Unauthorized");
    }
    return identity;
};

// --- Get all Super Goals for the current user ---
export const get = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }
        const superGoals = await ctx.db
            .query("superGoals")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
        // Sort by order field
        return superGoals.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    },
});

// --- Create a new Super Goal ---
export const create = mutation({
    args: {
        text: v.string(),
        description: v.optional(v.string()),
        bigGoalIds: v.array(v.string()),
        color: v.optional(v.string()),
        order: v.number(),
        createdAt: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const id = await ctx.db.insert("superGoals", {
            userId: identity.subject,
            text: args.text,
            description: args.description,
            bigGoalIds: args.bigGoalIds,
            color: args.color,
            order: args.order,
            createdAt: args.createdAt,
        });
        return id;
    },
});

// --- Update a Super Goal ---
export const update = mutation({
    args: {
        id: v.id("superGoals"),
        text: v.optional(v.string()),
        description: v.optional(v.string()),
        bigGoalIds: v.optional(v.array(v.string())),
        color: v.optional(v.string()),
        order: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const { id, ...updates } = args;

        const superGoal = await ctx.db.get(id);
        if (!superGoal || superGoal.userId !== identity.subject) {
            throw new Error("Super Goal not found or unauthorized");
        }

        await ctx.db.patch(id, updates);
    },
});

// --- Delete a Super Goal ---
export const remove = mutation({
    args: { id: v.id("superGoals") },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const superGoal = await ctx.db.get(args.id);
        if (!superGoal || superGoal.userId !== identity.subject) {
            throw new Error("Unauthorized");
        }
        await ctx.db.delete(args.id);
    },
});

// --- Sync local Super Goals to DB (migration helper) ---
export const syncLocalData = mutation({
    args: {
        superGoals: v.any(), // Array of super goals from localStorage
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const superGoals = args.superGoals;

        if (!Array.isArray(superGoals)) return;

        let order = 0;
        for (const sg of superGoals) {
            await ctx.db.insert("superGoals", {
                userId: identity.subject,
                text: sg.text || "Untitled",
                description: sg.description,
                bigGoalIds: sg.bigGoalIds || [],
                color: sg.color,
                order: order++,
                createdAt: sg.createdAt || Date.now(),
            });
        }
    },
});
