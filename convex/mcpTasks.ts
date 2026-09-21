import { internalMutation, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/*
 * MCP から人間のタスクリストを読み書きする。
 *
 * タスクの正はブラウザの localStorage で、syncItems はその写し。
 * ここで書いたものは、開いているブラウザが次の pull で拾って画面に出る。
 *
 * sync.ts は payload を「ただ預かるだけ」にしてあるが、エージェントに
 * タスクを足させる以上、ここだけは中身を知る必要がある。
 * 形は src/lib/taskModel.ts の Item に合わせること。
 *
 * これらは internal。外からは convex/http.ts の /mcp/* 経由でしか呼べない。
 */

type SyncRow = Doc<"syncItems">;

interface StoredItem {
    id: string;
    type: "task" | "section";
    parentId: string | null;
    order: number;
    text: string;
    note?: string;
    done: boolean;
    filed?: boolean;
    kind?: "main" | "tanomi";
    color?: string;
    estimate?: number;
    assignedDate?: string;
    createdAt: number;
    updatedAt: number;
    deletedAt?: number;
}

function parseRow(row: SyncRow): StoredItem | null {
    if (row.deletedAt) return null;
    try {
        const raw = JSON.parse(row.payload) as Partial<StoredItem>;
        if (typeof raw.text !== "string") return null;
        return {
            ...raw,
            id: row.itemId,
            type: raw.type === "section" ? "section" : "task",
            parentId: typeof raw.parentId === "string" ? raw.parentId : null,
            order: typeof raw.order === "number" ? raw.order : 0,
            text: raw.text,
            done: raw.done === true,
            createdAt: typeof raw.createdAt === "number" ? raw.createdAt : row.updatedAt,
            updatedAt: row.updatedAt,
        };
    } catch {
        return null;
    }
}

async function loadItems(ctx: QueryCtx | MutationCtx, userId: string): Promise<StoredItem[]> {
    const rows = await ctx.db
        .query("syncItems")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    return rows.map(parseRow).filter((item): item is StoredItem => item !== null);
}

/** 親が消えている行はルート扱い。クライアント側の effectiveParentId と同じ */
function effectiveParentId(byId: Map<string, StoredItem>, item: StoredItem): string | null {
    return item.parentId && byId.has(item.parentId) ? item.parentId : null;
}

function childrenOf(items: StoredItem[], parentId: string | null): StoredItem[] {
    const byId = new Map(items.map((i) => [i.id, i]));
    return items
        .filter((i) => effectiveParentId(byId, i) === parentId)
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
}

function nextOrder(items: StoredItem[], parentId: string | null): number {
    const siblings = childrenOf(items, parentId);
    return siblings.length === 0 ? 0 : siblings[siblings.length - 1].order + 1;
}

async function writeItem(ctx: MutationCtx, userId: string, item: StoredItem): Promise<void> {
    const payload = JSON.stringify(item);
    const existing = await ctx.db
        .query("syncItems")
        .withIndex("by_user_item", (q) => q.eq("userId", userId).eq("itemId", item.id))
        .unique();

    if (existing) {
        await ctx.db.patch(existing._id, { updatedAt: item.updatedAt, deletedAt: undefined, payload });
        return;
    }
    await ctx.db.insert("syncItems", {
        userId,
        itemId: item.id,
        updatedAt: item.updatedAt,
        payload,
    });
}

/**
 * 同じミリ秒に2つ書くと updatedAt が並び、あとの変更が「古い」と見なされる。
 * 既存の最大値より必ず1つ進めておく。
 */
function stampAfter(items: StoredItem[]): number {
    const newest = items.reduce((max, i) => Math.max(max, i.updatedAt), 0);
    return Math.max(Date.now(), newest + 1);
}

interface TaskView {
    id: string;
    text: string;
    note?: string;
    done: boolean;
    label?: string;
    estimate_minutes?: number;
    subtasks?: { id: string; text: string; done: boolean }[];
}

function toView(item: StoredItem, label: string | undefined, subtasks: StoredItem[]): TaskView {
    const view: TaskView = { id: item.id, text: item.text, done: item.done };
    if (item.note?.trim()) view.note = item.note;
    if (label) view.label = label;
    if (typeof item.estimate === "number") view.estimate_minutes = item.estimate;
    if (subtasks.length > 0) {
        view.subtasks = subtasks.map((s) => ({ id: s.id, text: s.text, done: s.done }));
    }
    return view;
}

export const list = internalQuery({
    args: { userId: v.string(), includeDone: v.optional(v.boolean()) },
    handler: async (ctx, { userId, includeDone }) => {
        const items = await loadItems(ctx, userId);
        const byId = new Map(items.map((i) => [i.id, i]));

        const labels = items
            .filter((i) => i.type === "section" && i.text.trim())
            .map((i) => i.text.trim());

        const tasks: TaskView[] = [];
        for (const item of items.filter((i) => i.type === "task" && i.text.trim())) {
            const parent = item.parentId ? byId.get(item.parentId) : undefined;
            // サブタスクは親の下にまとめて出すので、単体では並べない
            if (parent?.type === "task") continue;
            if (!includeDone && item.done) continue;

            const subtasks = childrenOf(items, item.id).filter((s) => s.text.trim());
            tasks.push(
                toView(
                    item,
                    parent?.type === "section" ? parent.text.trim() : undefined,
                    includeDone ? subtasks : subtasks.filter((s) => !s.done)
                )
            );
        }

        return { labels: [...new Set(labels)], tasks };
    },
});

export const add = internalMutation({
    args: {
        userId: v.string(),
        text: v.string(),
        note: v.optional(v.string()),
        label: v.optional(v.string()),
        estimateMinutes: v.optional(v.number()),
        parentId: v.optional(v.string()),
    },
    handler: async (ctx, { userId, text, note, label, estimateMinutes, parentId }) => {
        const trimmed = text.trim();
        if (!trimmed) throw new ConvexError("text is empty");

        const items = await loadItems(ctx, userId);
        const byId = new Map(items.map((i) => [i.id, i]));

        let parent: string | null = null;
        let labelNotFound: string | undefined;

        if (parentId) {
            const target = byId.get(parentId);
            if (!target) throw new ConvexError("parent not found");
            parent = target.id;
        } else if (label?.trim()) {
            const wanted = label.trim().toLowerCase();
            const found = items.find(
                (i) => i.type === "section" && i.text.trim().toLowerCase() === wanted
            );
            // 勝手にラベルを増やすと散らかるので、無ければルートに置いて知らせる
            if (found) parent = found.id;
            else labelNotFound = label.trim();
        }

        const now = stampAfter(items);
        const item: StoredItem = {
            id: crypto.randomUUID(),
            type: "task",
            parentId: parent,
            order: nextOrder(items, parent),
            text: trimmed,
            done: false,
            createdAt: now,
            updatedAt: now,
        };
        if (note?.trim()) item.note = note;
        if (typeof estimateMinutes === "number" && estimateMinutes > 0) {
            item.estimate = Math.round(estimateMinutes);
        }

        await writeItem(ctx, userId, item);
        return { id: item.id, text: item.text, label_not_found: labelNotFound };
    },
});

export const complete = internalMutation({
    args: { userId: v.string(), taskId: v.string(), done: v.optional(v.boolean()) },
    handler: async (ctx, { userId, taskId, done }) => {
        const items = await loadItems(ctx, userId);
        const target = items.find((i) => i.id === taskId);
        if (!target || target.type !== "task") throw new ConvexError("task not found");

        const next = done ?? true;
        let stamp = stampAfter(items);

        // 子タスクも一緒に。クライアントの toggleDone と揃える
        const subtree = [target, ...childrenOf(items, target.id)];
        for (const item of subtree) {
            if (item.type !== "task" || item.done === next) continue;
            await writeItem(ctx, userId, {
                ...item,
                done: next,
                filed: next ? item.filed : undefined,
                updatedAt: stamp++,
            });
        }
        return { id: target.id, text: target.text, done: next };
    },
});

export const update = internalMutation({
    args: {
        userId: v.string(),
        taskId: v.string(),
        text: v.optional(v.string()),
        note: v.optional(v.string()),
        estimateMinutes: v.optional(v.number()),
    },
    handler: async (ctx, { userId, taskId, text, note, estimateMinutes }) => {
        const items = await loadItems(ctx, userId);
        const target = items.find((i) => i.id === taskId);
        if (!target) throw new ConvexError("task not found");

        const next: StoredItem = { ...target, updatedAt: stampAfter(items) };
        if (text !== undefined) {
            if (!text.trim()) throw new ConvexError("text is empty");
            next.text = text.trim();
        }
        if (note !== undefined) next.note = note.trim() ? note : undefined;
        if (estimateMinutes !== undefined) {
            next.estimate = estimateMinutes > 0 ? Math.round(estimateMinutes) : undefined;
        }

        await writeItem(ctx, userId, next);
        return { id: next.id, text: next.text };
    },
});
