import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const getUser = async (ctx: any) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Unauthorized");
    }
    return identity;
};

// --- Bookmarks ---

export const getBookmarks = query({
    args: {},
    handler: async (ctx) => {
        const identity = await getUser(ctx);
        return await ctx.db
            .query("bookmarks")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
    },
});

export const addBookmark = mutation({
    args: { name: v.string(), url: v.string() },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        await ctx.db.insert("bookmarks", {
            userId: identity.subject,
            name: args.name,
            url: args.url,
            createdAt: Date.now(),
        });
    },
});

export const removeBookmark = mutation({
    args: { id: v.id("bookmarks") },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const existing = await ctx.db.get(args.id);
        if (!existing || existing.userId !== identity.subject) return;
        await ctx.db.delete(args.id);
    },
});

export const syncBookmarks = mutation({
    args: { bookmarks: v.any() },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const bookmarks = args.bookmarks as { name: string, url: string }[];

        // Simple strategy: insert if not exists? Or overwrite is messy.
        // Let's just append for now or only run if DB is empty.
        const existing = await ctx.db
            .query("bookmarks")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .first();

        if (!existing && bookmarks.length > 0) {
            for (const b of bookmarks) {
                await ctx.db.insert("bookmarks", {
                    userId: identity.subject,
                    name: b.name,
                    url: b.url,
                    createdAt: Date.now(),
                });
            }
        }
    }
});

// --- Document (Text) ---

export const getDocument = query({
    args: {},
    handler: async (ctx) => {
        const identity = await getUser(ctx);
        const doc = await ctx.db
            .query("documents")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .first();
        return doc;
    },
});

export const saveDocument = mutation({
    args: { text: v.string() },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const doc = await ctx.db
            .query("documents")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .first();

        if (doc) {
            await ctx.db.patch(doc._id, { text: args.text, updatedAt: Date.now() });
        } else {
            await ctx.db.insert("documents", {
                userId: identity.subject,
                text: args.text,
                updatedAt: Date.now(),
            });
        }
    },
});

export const syncDocument = mutation({
    args: { text: v.string() },
    handler: async (ctx, args) => {
        const identity = await getUser(ctx);
        const doc = await ctx.db
            .query("documents")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .first();

        // Only save initial sync if empty
        if (!doc) {
            await ctx.db.insert("documents", {
                userId: identity.subject,
                text: args.text,
                updatedAt: Date.now(),
            });
        }
    }
});
