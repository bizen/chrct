/**
 * MCP サーバ（Vercel Functions）が読む環境変数。
 * 公開鍵と Convex の URL は、フロント用に置いてある VITE_ のものがあればそれを使う。
 */
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function clerkPublishableKey(): string {
  return required(
    'CLERK_PUBLISHABLE_KEY',
    process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY
  );
}

export function clerkSecretKey(): string {
  return required('CLERK_SECRET_KEY', process.env.CLERK_SECRET_KEY);
}

export function convexUrl(): string {
  return required('CONVEX_URL', process.env.CONVEX_URL ?? process.env.VITE_CONVEX_URL);
}

/**
 * Convex の HTTP アクションの入口。関数用の .convex.cloud とは別ドメイン。
 * 明示されていなければ、関数用の URL から機械的に導く。
 */
export function convexSiteUrl(): string {
  const explicit = process.env.CONVEX_SITE_URL ?? process.env.VITE_CONVEX_SITE_URL;
  const base = explicit ?? convexUrl().replace(/\.convex\.cloud$/, '.convex.site');
  return base.replace(/\/$/, '');
}

export function mcpSecret(): string {
  return required('MCP_SHARED_SECRET', process.env.MCP_SHARED_SECRET);
}

/**
 * Clerk の Frontend API の URL。OAuth の認可サーバはここになる。
 * 公開鍵は `pk_(test|live)_` + base64("<frontend api のホスト>$")。
 */
export function clerkIssuer(): string {
  const encoded = clerkPublishableKey().replace(/^pk_(test|live)_/, '');
  const host = Buffer.from(encoded, 'base64').toString('utf8').replace(/\$$/, '');
  return `https://${host}`;
}
