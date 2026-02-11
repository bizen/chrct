import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    tasks: defineTable({
        userId: v.string(),
        text: v.string(),
        status: v.string(), // 'idle' | 'active' | 'completed'
        completedAt: v.optional(v.string()),
        completedTimestamp: v.optional(v.number()),
        firstMove: v.optional(v.string()),
        totalTime: v.optional(v.number()),
        activeSince: v.optional(v.number()),
        parentId: v.optional(v.id("tasks")),
        order: v.number(), // Lexorank or simple index. stick to simple number for now.
        dailyRepeat: v.optional(v.boolean()), // If true, task resets to 'idle' each day
    })
        .index("by_user", ["userId"])
        .index("by_user_parent", ["userId", "parentId"]),

    superGoals: defineTable({
        userId: v.string(),
        text: v.string(),
        description: v.optional(v.string()),
        bigGoalIds: v.array(v.string()), // Array of task _id strings
        color: v.optional(v.string()),
        order: v.number(),
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    documents: defineTable({
        userId: v.string(),
        text: v.string(),
        updatedAt: v.number(),
    }).index("by_user", ["userId"]),
});
