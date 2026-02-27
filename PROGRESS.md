# PROGRESS.md — 営業DXシステム開発 SSOT

## Current Status
- **セキュリティ対策完了**: Next.js Middleware (`src/middleware.ts`) で全管理APIを認証保護。Vercel環境変数 `API_SECRET` 設定済み。
- **Supabase連携修正完了**: `src/lib/supabase.ts` の `saveReport`/`getReport` を `client_name` にトークン埋め込み方式（`token::clientName`）に変更。10件の既存レポートをSupabaseに同期済み。
- **レポートURL修正完了（2回目）**: `src/app/leads/page.tsx` の診断レポートタブ内「レポート表示」リンク（857行目）と「URL取得」ボタン（860行目）が `window.location.origin` / 相対パスを使っていたのを `https://proposal-viewer-zeta.vercel.app` にハードコード固定。
- **起動ワークフロー作成**: `.agent/workflows/start.md`（`/start` で即起動可能）
- **スキルファイル作成**: `.agent/skills/SKILL.md` にプロジェクト全体情報を記録
- **最終コミット**: `2f22d7d` — `fix: 診断レポートタブのURLをVercel公開URLに固定（localhost問題修正）`

## Pending Tasks
1. Vercelデプロイ（最新コミット `43a06c9` の反映 — `npx vercel --prod --yes`）
2. Supabase Row Level Security (RLS) の適用検討
3. トラッキングピクセル (`/api/tracking`) のVercel対応（現在SQLite依存で500エラー）
4. スクレイピング機能 (`/api/scrape`) のVercel対応（`child_process.spawn` 非互換）

## Known Issues
- `/api/tracking` — Vercel上でSQLite不可のため500エラー（認証はパス）。Supabase版tracking_eventsテーブルが必要。
- `/api/scrape` — Pythonスクリプト実行がVercel非互換。ローカル専用のまま。
- Supabase `proposals` テーブルに `token` カラムは追加されていない（コード側で `client_name` に埋め込む方式で回避済み）。

## Context
- **ハイブリッド構成**: ローカル = フル機能（SQLite + Supabase）、Vercel = 提案書閲覧専用（Supabase のみ）
- **認証方式**: Vercel管理APIは `x-api-secret` ヘッダー認証（`API_SECRET` 環境変数）。ローカルは認証不要。
- **公開ルート**: `/api/proposals/[token]`（32文字ランダムトークン）、`/api/tracking`（GIFピクセル）のみ
- **Gemini API**: `@google/genai` パッケージ使用。LP生成 + 診断レポート生成の2段構成。レート制限回避のため15秒待機あり。
- **GitHub**: `koheichiba0714-dev/proposal-viewer` (main) → Vercel自動デプロイは未設定（手動 `npx vercel --prod --yes`）
- **環境変数**: `.env.local` にGemini/Supabase/PROPOSAL_BASE_URLを格納。Vercelにも同一変数 + `API_SECRET` を設定済み。
