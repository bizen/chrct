import { getPublicOrigin, metadataCorsOptionsRequestHandler, protectedResourceHandler } from 'mcp-handler';
import { clerkIssuer } from './_lib/env.js';

/**
 * RFC 9728 の Protected Resource Metadata。
 * MCP クライアントはここを見て、Clerk へ OAuth しに行く。
 * /.well-known/oauth-protected-resource(/mcp) から vercel.json で書き換えて届く。
 */
export function GET(request: Request): Response {
  return protectedResourceHandler({
    authServerUrls: [clerkIssuer()],
    resourceUrl: `${getPublicOrigin(request)}/mcp`,
  })(request);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
