import { createClerkClient } from '@clerk/backend';
import type { AuthInfo, CallToolResult, ServerContext } from '@modelcontextprotocol/server';
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import { clerkPublishableKey, clerkSecretKey, convexSiteUrl, mcpSecret } from './_lib/env.js';

/*
 * chrct の MCP サーバ。
 *
 * Claude や ChatGPT の connector から /mcp に来る。Clerk の OAuth トークンで人を
 * 特定し、その userId を Convex の /mcp/* （convex/http.ts）へ渡す。
 * 共有の秘密は Authorization ヘッダで送る。Convex の関数の引数に載せると
 * 実行ログに残るため。
 *
 * ここは中継だけ。並びや親子の面倒は Convex 側の mcpTasks が持つ。
 */

const INSTRUCTIONS = `chrct is the user's own task list — the one they look at and work from. This server lets you read it and put things into it.

Use add_task when the user asks you to remember something, or when your conversation produces a follow-up they will have to do themselves. One line, in the user's language (usually Japanese), phrased as the user would write it — not as a report to them.

Call list_tasks first when you need to know what is already there, or to get the exact label names and task ids. Labels are the user's own groupings; add_task only files a task under a label that already exists.

This is the user's list, not a scratchpad. Do not add duplicates, do not add things they did not ask for, and do not complete a task unless they said it is done.`;

const clerk = createClerkClient({
  secretKey: clerkSecretKey(),
  publishableKey: clerkPublishableKey(),
});

async function verifyToken(request: Request, token?: string): Promise<AuthInfo | undefined> {
  if (!token) return undefined;
  const state = await clerk.authenticateRequest(request, { acceptsToken: 'oauth_token' });
  const auth = state.toAuth();
  if (!auth?.isAuthenticated || !auth.userId) return undefined;
  return {
    token,
    clientId: auth.clientId ?? 'unknown',
    scopes: auth.scopes ?? [],
    extra: { userId: auth.userId },
  };
}

function userIdOf(ctx: ServerContext): string {
  const userId = ctx.http?.authInfo?.extra?.userId;
  if (typeof userId !== 'string') throw new Error('Not signed in');
  return userId;
}

function json(value: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

/** Convex 側が返した理由（「そのラベルは無い」など）は、そのままエージェントに見せる */
async function call(
  ctx: ServerContext,
  path: string,
  body: Record<string, unknown>
): Promise<CallToolResult> {
  try {
    const response = await fetch(`${convexSiteUrl()}/mcp/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mcpSecret()}`,
      },
      body: JSON.stringify({ ...body, userId: userIdOf(ctx) }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      return {
        isError: true,
        content: [{ type: 'text', text: payload?.error ?? `HTTP ${response.status}` }],
      };
    }
    return json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { isError: true, content: [{ type: 'text', text: message }] };
  }
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'list_tasks',
      {
        title: "Read the user's task list",
        description:
          "Read the user's task list: what is still open, which labels exist, and the ids you need for the other tools. Unfinished tasks only unless include_done is set.",
        inputSchema: z.object({
          include_done: z.boolean().optional().describe('Also return finished tasks'),
        }),
        annotations: { readOnlyHint: true },
      },
      ({ include_done }, ctx) => call(ctx, 'list', { includeDone: include_done })
    );

    server.registerTool(
      'add_task',
      {
        title: "Add a task to the user's list",
        description:
          "Put one task into the user's list. Write it as a line the user would write for themselves, in their language. Use label only with a name from list_tasks; an unknown label leaves the task at the top level and is reported back. Use parent_task_id to add it as a subtask of an existing task.",
        inputSchema: z.object({
          text: z.string().describe('One line, like a task list entry'),
          note: z.string().optional().describe('Details or context, shown under the task'),
          label: z.string().optional().describe('An existing label name from list_tasks'),
          estimate_minutes: z.number().int().positive().optional().describe('Rough working time'),
          parent_task_id: z.string().optional().describe('Add as a subtask of this task'),
        }),
      },
      ({ text, note, label, estimate_minutes, parent_task_id }, ctx) =>
        call(ctx, 'add', {
          text,
          note,
          label,
          estimateMinutes: estimate_minutes,
          parentId: parent_task_id,
        })
    );

    server.registerTool(
      'complete_task',
      {
        title: 'Check off a task',
        description:
          'Mark a task as done, together with its subtasks. Only when the user has said it is done — do not decide that yourself. Pass done: false to put it back.',
        inputSchema: z.object({
          task_id: z.string(),
          done: z.boolean().optional().describe('false puts the task back to unfinished'),
        }),
      },
      ({ task_id, done }, ctx) => call(ctx, 'complete', { taskId: task_id, done })
    );

    server.registerTool(
      'update_task',
      {
        title: 'Edit a task',
        description:
          "Change the wording, the note or the estimate of a task that is already in the list, or put it into (or take it out of) the user's today list.",
        inputSchema: z.object({
          task_id: z.string(),
          text: z.string().optional(),
          note: z.string().optional().describe('Empty string clears the note'),
          estimate_minutes: z.number().int().min(0).optional().describe('0 clears the estimate'),
          today: z
            .string()
            .optional()
            .describe(
              "The user's local date as YYYY-MM-DD puts the task into today. Empty string takes it out"
            ),
        }),
      },
      ({ task_id, text, note, estimate_minutes, today }, ctx) =>
        call(ctx, 'update', {
          taskId: task_id,
          text,
          note,
          estimateMinutes: estimate_minutes,
          today,
        })
    );
  },
  {
    serverInfo: { name: 'chrct', version: '0.1.0' },
    instructions: INSTRUCTIONS,
  }
);

const authed = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp',
});

export const GET = authed;
export const POST = authed;
export const DELETE = authed;
