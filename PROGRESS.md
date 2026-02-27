# PROGRESS.md — 営業DXシステム開発 SSOT

## Current Status
- **セキュリティ対策完了**: Next.js Middleware (`src/middleware.ts`) で全管理APIを認証保護。Vercel環境変数 `API_SECRET` 設定済み。
- **Supabase連携修正完了**: `src/lib/supabase.ts` の `saveReport`/`getReport` を `client_name` にトークン埋め込み方式（`token::clientName`）に変更。10件の既存レポートをSupabaseに同期済み。
- **レポートURL修正完了**: `src/app/leads/page.tsx` の3箇所を修正 — ①レポート生成時のアラート（237行目）、②「レポート表示」リンク（857行目）、③「URL取得」ボタン（860行目）をすべて `https://proposal-viewer-zeta.vercel.app` にハードコード固定。
- **現在サイトプレビュー修正完了**: `src/lib/gemini.ts` の診断レポート内「現在のWEBサイト」表示を `<iframe src>` からスクリーンショットサムネイル画像（thum.io → microlink.io フォールバック）+ リンクボタンに変更。X-Frame-Optionsブロック問題を解消。
- **起動ワークフロー作成**: `.agent/workflows/start.md`（`/start` で即起動可能）
- **スキルファイル作成**: `.agent/skills/SKILL.md` にプロジェクト全体情報を記録
- **Vercelデプロイ完了**: コミット `f4caf2c` まで反映済み（2026-02-27 15:10）
- **最終コミット**: `f4caf2c` — `fix: 診断レポートの現在サイト表示をiframeからスクリーンショット画像+リンクに変更`

## Pending Tasks
1. Supabase Row Level Security (RLS) の適用検討
2. トラッキングピクセル (`/api/tracking`) のVercel対応（現在SQLite依存で500エラー）→ Supabase版tracking_eventsテーブルが必要
3. スクレイピング機能 (`/api/scrape`) のVercel対応（`child_process.spawn` 非互換）
4. 既存レポート（iframe版）の再生成（必要に応じて個別対応）

## Known Issues
- `/api/tracking` — Vercel上でSQLite不可のため500エラー（認証はパス）。Supabase版tracking_eventsテーブルが必要。
- `/api/scrape` — Pythonスクリプト実行がVercel非互換。ローカル専用のまま。
- Supabase `proposals` テーブルに `token` カラムは追加されていない（コード側で `client_name` に埋め込む方式で回避済み）。
- 既存の診断レポート（`f4caf2c` 以前に生成）は現在サイト部分がiframeのままで、X-Frame-Optionsでブロックされる可能性がある。再生成で解消。

## Context
- **ハイブリッド構成**: ローカル = フル機能（SQLite + Supabase）、Vercel = 提案書閲覧専用（Supabase のみ）
- **認証方式**: Vercel管理APIは `x-api-secret` ヘッダー認証（`API_SECRET` 環境変数）。ローカルは認証不要。
- **公開ルート**: `/api/proposals/[token]`（32文字ランダムトークン）、`/api/tracking`（GIFピクセル）のみ
- **Gemini API**: `@google/genai` パッケージ使用。LP生成 + 診断レポート生成の2段構成。レート制限回避のため15秒待機あり。
- **GitHub**: `koheichiba0714-dev/proposal-viewer` (main) → Vercel自動デプロイは未設定（手動 `npx vercel --prod --yes`）
- **環境変数**: `.env.local` にGemini/Supabase/PROPOSAL_BASE_URLを格納。Vercelにも同一変数 + `API_SECRET` を設定済み。
- **現在サイトプレビュー**: thum.io（プライマリ）→ microlink.io（フォールバック）でスクリーンショット画像を取得。iframe非使用。
