---
description: 営業DXシステムをローカルで起動する
---

# 営業DXシステム起動

## 手順

// turbo-all

1. 依存パッケージのインストール（初回 or 更新時のみ）
```bash
cd /Users/chibakohei/.gemini/antigravity/scratch/sales-dx && npm install
```

2. 開発サーバーを起動
```bash
cd /Users/chibakohei/.gemini/antigravity/scratch/sales-dx && npm run dev
```

3. ブラウザで http://localhost:3000 を開く

## 環境情報
- **ローカル**: `http://localhost:3000` — 営業管理（リード、分析、メール、トラッキング）
- **Vercel**: `https://proposal-viewer-zeta.vercel.app` — 提案書ビューア（顧客向け）
- **Supabase**: レポートデータ保存
- **GitHub**: `koheichiba0714-dev/proposal-viewer`（mainブランチ）

## ポート競合時
```bash
# ポート3000が使用中の場合、プロセスを確認・停止
lsof -i :3000 -t | xargs kill -9
npm run dev
```
