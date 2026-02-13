import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const getUser = async (ctx: any) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Unauthorized");
    }
    return identity;
};

// --- Document (Text) ---

export const getDocument = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }
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
