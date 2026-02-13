import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper to ensure user is authenticated
const getUser = async (ctx: any) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Unauthorized");
    }
    return identity;
};

export const get = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
        return tasks;
    },
});

export const create = mutation({
    args: {
        text: v.string(),
        status: v.string(),
        parentId: v.optional(v.id("tasks")),
        order: v.number(),
        completedAt: v.optional(v.string()),
        completedTimestamp: v.optional(v.number()),
        firstMove: v.optional(v.string()),
        totalTime: v.optional(v.number()),
        activeSince: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const taskId = await ctx.db.insert("tasks", {
            userId: identity.subject,
            text: args.text,
            status: args.status,
            parentId: args.parentId,
            order: args.order,
            completedAt: args.completedAt,
            completedTimestamp: args.completedTimestamp,
            firstMove: args.firstMove,
            totalTime: args.totalTime,
            activeSince: args.activeSince,
        });
        return taskId;
    },
});

export const update = mutation({
    args: {
        id: v.id("tasks"),
        text: v.optional(v.string()),
        status: v.optional(v.string()),
        completedAt: v.optional(v.string()),
        completedTimestamp: v.optional(v.number()),
        firstMove: v.optional(v.string()),
        totalTime: v.optional(v.number()),
        activeSince: v.optional(v.number()),
        parentId: v.optional(v.id("tasks")),
        order: v.optional(v.number()),
        dailyRepeat: v.optional(v.boolean()),
        // We allow clearing fields by passing explicit null? 
        // Convex V doesn't support null easily for optional fields unless we use v.union([v.string(), v.null()])
        // But for now let's assume we just patch what is provided.
        // If we need to "unset" activeSince, we might need a specific flag or pass undefined.
        // However, JSON doesn't pass undefined.
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const { id, ...updates } = args;

        // Verify ownership
        const task = await ctx.db.get(id);
        if (!task || task.userId !== identity.subject) {
            throw new Error("Task not found or unauthorized");
        }

        await ctx.db.patch(id, updates);
    },
});

export const remove = mutation({
    args: { id: v.id("tasks") },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const task = await ctx.db.get(args.id);
        if (!task || task.userId !== identity.subject) {
            throw new Error("Unauthorized");
        }

        // Recursive delete helper could be here, but for now just delete the node.
        // Ideally we delete children too.
        const deleteChildren = async (parentId: any) => {
            const children = await ctx.db
                .query("tasks")
                .withIndex("by_user_parent", (q) => q.eq("userId", identity.subject).eq("parentId", parentId))
                .collect();
            for (const child of children) {
                await deleteChildren(child._id);
                await ctx.db.delete(child._id);
            }
        };

        await deleteChildren(args.id);
        await ctx.db.delete(args.id);
    },
});

export const syncLocalData = mutation({
    args: {
        tasks: v.any(), // Array of flat tasks with temporary IDs + parent references
    },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const tasks = args.tasks; // Expecting flat list from frontend migration logic

        // Map old temporary ID -> new Convex ID


        // Sort by depth or just insert parents first? 
        // Assuming the frontend sends a format we can process. 
        // Actually, simplest is to insert all, then patch parents?
        // Or insert in order.

        // Let's assume frontend sends a flat list where parents appear before children, or we handle it in two passes.
        // Two passes: 
        // 1. Insert all tasks, storing oldId -> newId mapping. Ignore parentId for now.
        // 2. Patch all tasks with encoded parentId using the mapping.

        // But we can't patch if we don't have the ID.
        // Better: frontend sends a tree, we traverse recursively.

        // Let's assume input is a recursive tree structure: Task[]
        const insertTree = async (nodes: any[], parentId?: any) => {
            let index = 0;
            for (const node of nodes) {
                const newId = await ctx.db.insert("tasks", {
                    userId: identity.subject,
                    text: node.text,
                    status: node.status,
                    completedAt: node.completedAt,
                    completedTimestamp: node.completedTimestamp,
                    firstMove: node.firstMove,
                    totalTime: node.totalTime,
                    activeSince: node.activeSince,
                    order: index++,
                    parentId: parentId
                });

                if (node.subtasks && node.subtasks.length > 0) {
                    await insertTree(node.subtasks, newId);
                }
            }
        };

        if (Array.isArray(tasks)) {
            await insertTree(tasks, undefined);
        }
    }
});
