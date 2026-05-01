import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    tasks: defineTable({
        userId: v.string(),
        text: v.string(),
        done: v.boolean(),
        order: v.number(),
        createdAt: v.number(),
        kind: v.optional(v.union(v.literal("main"), v.literal("tanomi"))),
    }).index("by_user", ["userId"]),
});
