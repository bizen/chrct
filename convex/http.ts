import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/*
 * MCP サーバ（api/mcp.ts）からの入口。
 *
 * 呼び出し元の確認は Authorization ヘッダで行う。Convex の関数の引数に
 * 秘密を載せると、ダッシュボードの実行ログや引数の検証エラーに残るため。
 * 秘密は Convex と Vercel の両方に MCP_SHARED_SECRET で置く。
 *
 * 人の特定は MCP 側が Clerk の OAuth トークンで済ませていて、ここには
 * その結果の userId だけが渡ってくる。
 */

function sharedSecret(): string | undefined {
    const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process
        ?.env;
    return env?.MCP_SHARED_SECRET;
}

/** 文字数の違いから中身を推測されないよう、長さによらず全桁を比べる */
function sameSecret(given: string, expected: string): boolean {
    const length = Math.max(given.length, expected.length);
    let diff = given.length ^ expected.length;
    for (let i = 0; i < length; i++) {
        diff |= (given.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
    }
    return diff === 0;
}

function authorized(request: Request): boolean {
    const expected = sharedSecret();
    if (!expected) return false;
    const header = request.headers.get("Authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    return token.length > 0 && sameSecret(token, expected);
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

/** 中の関数が投げた理由は、そのままエージェントに見せたいので本文に載せる */
function route(run: (ctx: Parameters<Parameters<typeof httpAction>[0]>[0], body: Record<string, unknown>) => Promise<unknown>) {
    return httpAction(async (ctx, request) => {
        if (!authorized(request)) return jsonResponse({ error: "Unauthorized" }, 401);

        let body: Record<string, unknown>;
        try {
            body = (await request.json()) as Record<string, unknown>;
        } catch {
            return jsonResponse({ error: "Invalid JSON body" }, 400);
        }
        if (typeof body.userId !== "string" || !body.userId) {
            return jsonResponse({ error: "userId is required" }, 400);
        }

        try {
            return jsonResponse(await run(ctx, body));
        } catch (error) {
            const message =
                typeof (error as { data?: unknown })?.data === "string"
                    ? ((error as { data: string }).data)
                    : error instanceof Error
                      ? error.message
                      : "Unknown error";
            return jsonResponse({ error: message }, 400);
        }
    });
}

const http = httpRouter();

http.route({
    path: "/mcp/list",
    method: "POST",
    handler: route((ctx, body) =>
        ctx.runQuery(internal.mcpTasks.list, {
            userId: body.userId as string,
            includeDone: body.includeDone === true,
        })
    ),
});

http.route({
    path: "/mcp/add",
    method: "POST",
    handler: route((ctx, body) =>
        ctx.runMutation(internal.mcpTasks.add, {
            userId: body.userId as string,
            text: String(body.text ?? ""),
            note: typeof body.note === "string" ? body.note : undefined,
            label: typeof body.label === "string" ? body.label : undefined,
            estimateMinutes:
                typeof body.estimateMinutes === "number" ? body.estimateMinutes : undefined,
            parentId: typeof body.parentId === "string" ? body.parentId : undefined,
        })
    ),
});

http.route({
    path: "/mcp/complete",
    method: "POST",
    handler: route((ctx, body) =>
        ctx.runMutation(internal.mcpTasks.complete, {
            userId: body.userId as string,
            taskId: String(body.taskId ?? ""),
            done: typeof body.done === "boolean" ? body.done : undefined,
        })
    ),
});

http.route({
    path: "/mcp/update",
    method: "POST",
    handler: route((ctx, body) =>
        ctx.runMutation(internal.mcpTasks.update, {
            userId: body.userId as string,
            taskId: String(body.taskId ?? ""),
            text: typeof body.text === "string" ? body.text : undefined,
            note: typeof body.note === "string" ? body.note : undefined,
            estimateMinutes:
                typeof body.estimateMinutes === "number" ? body.estimateMinutes : undefined,
            today: typeof body.today === "string" ? body.today : undefined,
        })
    ),
});

http.route({
    path: "/mcp/add-label",
    method: "POST",
    handler: route((ctx, body) =>
        ctx.runMutation(internal.mcpTasks.addLabel, {
            userId: body.userId as string,
            name: String(body.name ?? ""),
        })
    ),
});

http.route({
    path: "/mcp/move",
    method: "POST",
    handler: route((ctx, body) =>
        ctx.runMutation(internal.mcpTasks.move, {
            userId: body.userId as string,
            taskId: String(body.taskId ?? ""),
            label: typeof body.label === "string" ? body.label : undefined,
            parentTaskId: typeof body.parentTaskId === "string" ? body.parentTaskId : undefined,
        })
    ),
});

http.route({
    path: "/mcp/label-to-task",
    method: "POST",
    handler: route((ctx, body) =>
        ctx.runMutation(internal.mcpTasks.labelToTask, {
            userId: body.userId as string,
            label: String(body.label ?? ""),
            intoLabel: typeof body.intoLabel === "string" ? body.intoLabel : undefined,
        })
    ),
});

export default http;
