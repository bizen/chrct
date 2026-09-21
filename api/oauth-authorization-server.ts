import { metadataCorsOptionsRequestHandler } from 'mcp-handler';
import { clerkIssuer } from './_lib/env.js';

/**
 * RFC 8414 の Authorization Server Metadata。
 * 古い MCP クライアントは、MCP サーバと同じホストにこれを探しに来るので、Clerk のものをそのまま返す。
 */
export async function GET(): Promise<Response> {
  const upstream = await fetch(`${clerkIssuer()}/.well-known/oauth-authorization-server`);
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=3600',
      'Content-Type': 'application/json',
    },
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
