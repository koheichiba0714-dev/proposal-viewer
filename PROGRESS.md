# PROGRESS.md — 営業DXシステム開発 SSOT

## Current Status
- **リード管理画面UX改善Phase1完了**: テーブルビュー+多軸フィルター+右スライドパネル+一括操作を実装。コミット `0b62ba6`。
- **セキュリティ対策完了**: Next.js Middleware (`src/middleware.ts`) で全管理APIを認証保護。Vercel環境変数 `API_SECRET` 設定済み。
- **Supabase連携修正完了**: `src/lib/supabase.ts` の `saveReport`/`getReport` を `client_name` にトークン埋め込み方式に変更。
- **レポートURL修正完了**: 全URLを `https://proposal-viewer-zeta.vercel.app` にハードコード固定。
- **現在サイトプレビュー修正完了**: `gemini.ts` のiframeをスクリーンショット画像+リンクに変更。
- **Vercelデプロイ完了**: コミット `0b62ba6` まで反映済み（2026-02-27 15:46）

## リード管理画面 UX改善 Phase1 詳細
- `GET /api/leads` → `{ data: [...], meta: { industries, areas } }` 形式に拡張
- `POST /api/leads/bulk-update` 新設（ステータス一括変更・一括削除）
- `globals.css` にフィルターバー/テーブル/スライドパネル/一括操作バー/トーストのCSS追加
- `page.tsx` 全面リライト:
  - 多軸フィルタリング（検索・業種・エリア・ステータス・スコア範囲・日付プリセット）
  - テーブルビュー（ソート・スコアカラー・温度指標）
  - 右スライドインパネル（既存5タブ維持）
  - 一括操作（チェックボックス・ステータス変更・削除）
  - 確認モーダル・トースト通知

## Pending Tasks
1. Supabase Row Level Security (RLS) の適用検討
2. トラッキングピクセル (`/api/tracking`) のVercel対応（Supabase版tracking_eventsテーブルが必要）
3. スクレイピング機能 (`/api/scrape`) のVercel対応（`child_process.spawn` 非互換）
4. Phase2: 保存セグメント機能・ダッシュボード連動

## Known Issues
- `/api/tracking` — Vercel上でSQLite不可のため500エラー。Supabase版tracking_eventsテーブルが必要。
- `/api/scrape` — Pythonスクリプト実行がVercel非互換。ローカル専用。
- Supabase `proposals` テーブルに `token` カラムは追加していない（コード側で `client_name` に埋め込む方式で回避）。

## Context
- **ハイブリッド構成**: ローカル = フル機能（SQLite + Supabase）、Vercel = 提案書閲覧専用（Supabase のみ）
- **認証方式**: Vercel管理APIは `x-api-secret` ヘッダー認証。ローカルは認証不要。
- **公開ルート**: `/api/proposals/[token]`、`/api/tracking` のみ
- **Gemini API**: `@google/genai` パッケージ使用。LP生成 + 診断レポート生成の2段構成。
- **GitHub**: `koheichiba0714-dev/proposal-viewer` (main)
- **環境変数**: `.env.local` にGemini/Supabase/PROPOSAL_BASE_URLを格納。Vercelにも同一変数 + `API_SECRET` を設定済み。
- **現在サイトプレビュー**: thum.io（プライマリ）→ microlink.io（フォールバック）でスクリーンショット画像を取得。
