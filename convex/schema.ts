import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    /** タスクと区切り見出しを1列に並べる */
    taskListEntries: defineTable({
        userId: v.string(),
        order: v.number(),
        kind: v.union(v.literal("task"), v.literal("section")),
        taskId: v.optional(v.id("tasks")),
        sectionTitle: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    tasks: defineTable({
        userId: v.string(),
        text: v.string(),
        done: v.boolean(),
        createdAt: v.number(),
        kind: v.optional(v.union(v.literal("main"), v.literal("tanomi"))),
        /** タスクの補足・概要（任意） */
        summary: v.optional(v.string()),
        /** 旧スキーマの名残。既存ドキュメント互換用（新規コードでは使わない） */
        order: v.optional(v.number()),
        /** 旧ブロック参照（テーブル削除後もDBに残る場合の互換） */
        blockId: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    /** character count のストック（ログイン時に Convex へ） */
    countStocks: defineTable({
        userId: v.string(),
        text: v.string(),
        savedAt: v.number(),
    }).index("by_user", ["userId"]),
});
