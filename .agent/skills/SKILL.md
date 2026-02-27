---
description: 営業DXシステムのプロジェクト情報と環境構成
---

# 営業DXシステム（Sales DX）

## プロジェクト場所
```
/Users/chibakohei/.gemini/antigravity/scratch/sales-dx/
```

## 環境構成

| 環境 | URL / パス | 用途 |
|---|---|---|
| ローカル | `http://localhost:3000` | 営業管理（フル機能） |
| Vercel | `https://proposal-viewer-zeta.vercel.app` | 提案書ビューア（顧客向け） |
| GitHub | `koheichiba0714-dev/proposal-viewer` (main) | ソースコード管理 |
| Supabase | `https://qfmrcmegtlyxqhgqqxzl.supabase.co` | レポートデータ保存 |

## 技術スタック
- **フレームワーク**: Next.js 16 (Turbopack)
- **DB（ローカル）**: better-sqlite3
- **DB（クラウド）**: Supabase (PostgreSQL)
- **AI**: Gemini API (`@google/genai`)
- **デプロイ**: Vercel CLI (`npx vercel --prod --yes`)

## セキュリティ
- Vercel上の管理APIは `API_SECRET` ヘッダー認証で保護済み（`src/middleware.ts`）
- 公開ルート: `/api/proposals/[token]`, `/api/tracking` のみ
- ローカル開発は全て認証不要

## 起動方法
```bash
cd /Users/chibakohei/.gemini/antigravity/scratch/sales-dx && npm run dev
```
ワークフロー `/start` でも起動可能。

## 主要ファイル
- `src/lib/supabase.ts` — Supabase連携（レポート保存／取得）
- `src/lib/gemini.ts` — Gemini API（LP生成、レポート生成、LP編集）
- `src/lib/db.ts` — ローカルSQLite DB
- `src/lib/auth.ts` — 認証ヘルパー
- `src/middleware.ts` — API認証ミドルウェア
- `.env.local` — 環境変数（APIキー等）
