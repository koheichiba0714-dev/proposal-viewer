---
description: Sales DXシステムをローカルで起動する
---
// turbo-all

1. 依存関係をインストール（初回のみ）
```
cd /Users/chibakohei/.gemini/antigravity/scratch/sales-dx && npm install
```

2. 開発サーバーを起動
```
cd /Users/chibakohei/.gemini/antigravity/scratch/sales-dx && npm run dev
```

3. ブラウザで http://localhost:3000 を開く

4. 主要ページ：
   - リード一覧: http://localhost:3000/leads
   - スクレイピング: http://localhost:3000/scrape
   - メール: http://localhost:3000/emails
   - トラッキング: http://localhost:3000/tracking
