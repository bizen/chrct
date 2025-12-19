import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    tasks: defineTable({
        userId: v.string(),
        text: v.string(),
        status: v.string(), // 'idle' | 'active' | 'completed'
        completedAt: v.optional(v.string()),
        firstMove: v.optional(v.string()),
        totalTime: v.optional(v.number()),
        activeSince: v.optional(v.number()),
        parentId: v.optional(v.id("tasks")),
        order: v.number(), // Lexorank or simple index. stick to simple number for now.
    })
        .index("by_user", ["userId"])
        .index("by_user_parent", ["userId", "parentId"]),

    bookmarks: defineTable({
        userId: v.string(),
        name: v.string(),
        url: v.string(),
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    documents: defineTable({
        userId: v.string(),
        text: v.string(),
        updatedAt: v.number(),
    }).index("by_user", ["userId"]),
});
