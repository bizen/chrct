# chrct

シンプルな2機能アプリ。

- **`/count`** — 文字数カウント（ローカル保存、認証不要）
- **`/tasks`** — タスクリスト（Clerk 認証 + Convex で同期）

## スタック

- React 19 + Vite + TypeScript
- React Router v7
- Clerk（認証）
- Convex（バックエンド・リアルタイム同期）
- lucide-react（アイコン）

## セットアップ

```bash
npm install
```

`.env.local` に以下を設定:

```
VITE_CONVEX_URL=https://<your-project>.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

> 環境変数が無くても文字数カウントは動作します。タスクページのみ無効化されます。

## 開発

```bash
# Convex を起動（_generated を生成）
npm run convex

# 別ターミナルで Vite
npm run dev
```

## ビルド

```bash
npm run build
npm run preview
```

## ファイル構成

```
src/
  main.tsx                    ルートエントリ
  App.tsx                     シェル + トップナビ + ルーティング
  index.css                   スタイル
  pages/
    CountPage.tsx             文字数カウント
    TasksPage.tsx             タスクリスト
  components/
    ConvexClientProvider.tsx  Clerk + Convex プロバイダ
    ErrorBoundary.tsx         エラー境界
convex/
  schema.ts                   tasks テーブルのみ
  tasks.ts                    list / create / toggle / updateText / remove / clearCompleted
  auth.config.ts              Clerk 連携
```
