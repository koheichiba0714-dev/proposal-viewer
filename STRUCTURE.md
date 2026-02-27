# Sales DX — プロジェクト構成

## 概要
WEBサイト診断 → AIレポート自動生成 → 営業提案の一気通貫システム。

- **フレームワーク**: Next.js (App Router)
- **DB**: SQLite (better-sqlite3) — `data/sales-dx.db`
- **AI**: Google Gemini API (`gemini-2.5-flash` / `gemini-2.0-flash`)
- **ホスティング**: Vercel — https://proposal-viewer-zeta.vercel.app
- **GitHub**: https://github.com/koheichiba0714-dev/proposal-viewer
- **LP保存先**: Supabase Storage

## ディレクトリ構成

```
sales-dx/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # トップ（ダッシュボード）
│   │   ├── layout.tsx                # 共通レイアウト + Sidebar
│   │   ├── globals.css               # 全体CSS（FileMaker風UI）
│   │   ├── favicon.ico
│   │   │
│   │   ├── leads/page.tsx            # リード一覧（メインCRM画面）
│   │   ├── emails/page.tsx           # メール管理
│   │   ├── scrape/page.tsx           # Googleマップスクレイピング
│   │   ├── tracking/page.tsx         # トラッキング・分析
│   │   │
│   │   ├── proposals/[token]/        # 診断レポート公開ページ（顧客向け）
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   └── api/                      # APIルート
│   │       ├── leads/                # リードCRUD + 個別操作
│   │       │   ├── route.ts          #   GET（一覧）/ POST（新規作成）
│   │       │   └── [id]/
│   │       │       ├── route.ts      #   GET / PATCH / DELETE
│   │       │       ├── generate-report/route.ts  # 診断レポート生成
│   │       │       ├── generate/route.ts         # サンプルLP生成
│   │       │       └── edit-lp/route.ts          # LP編集（チャット形式）
│   │       ├── analyze/route.ts      # サイト分析
│   │       ├── proposals/
│   │       │   ├── route.ts          # 提案書CRUD
│   │       │   └── [token]/route.ts  # 公開レポート取得
│   │       ├── emails/route.ts       # メール管理
│   │       ├── scrape/               # スクレイピング
│   │       │   ├── route.ts          #   実行
│   │       │   └── status/route.ts   #   進捗取得
│   │       └── tracking/             # トラッキング
│   │           ├── route.ts          #   ピクセル（開封計測）
│   │           └── events/route.ts   #   イベント記録
│   │
│   ├── components/
│   │   └── Sidebar.tsx               # ナビゲーションサイドバー
│   │
│   └── lib/                          # ビジネスロジック
│       ├── gemini.ts                 # Gemini API（LP生成・レポート生成・LP編集）
│       ├── analyzer.ts               # サイト分析（50+チェック項目）
│       ├── auto-analyze.ts           # リード追加時の自動分析
│       ├── db.ts                     # SQLite DB初期化・マイグレーション
│       ├── deployer.ts               # FTPデプロイ（レガシー）
│       └── supabase.ts               # Supabase Storage操作
│
├── scripts/
│   └── scraper.py                    # Googleマップスクレイパー（Python）
│
├── data/                             # ※gitignore — ランタイムDB
│   └── sales-dx.db
│
├── public/
│   └── samples/                      # ※gitignore — 生成HTMLキャッシュ
│
├── .env.local                        # 環境変数（GEMINI_API_KEY等）
├── package.json
├── tsconfig.json
├── next.config.ts
└── .gitignore
```

## 環境変数

| 変数名 | 用途 |
|-------|------|
| `GEMINI_API_KEY` | Google Gemini API キー |
| `SUPABASE_URL` | Supabase プロジェクトURL |
| `SUPABASE_SERVICE_KEY` | Supabase サービスキー |
| `PROPOSAL_BASE_URL` | 診断レポート公開URL |

## 主要フロー

1. **リード取得**: Googleマップスクレイピング or 手動登録
2. **サイト分析**: 50+チェック項目で自動スコアリング（0-100点）
3. **レポート生成**: Gemini APIで LP + 診断レポート HTML生成
4. **提案送付**: レポートURLを顧客に送信
5. **トラッキング**: 開封・閲覧を自動計測
