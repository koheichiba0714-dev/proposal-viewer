---
description: Sales DXの変更をGitHub経由でVercelにデプロイする
---
// turbo-all

1. 変更をコミット
```
cd /Users/chibakohei/.gemini/antigravity/scratch/sales-dx && git add -A && git status
```

2. コミットメッセージを付けてコミット（内容に応じて変更）
```
cd /Users/chibakohei/.gemini/antigravity/scratch/sales-dx && git commit -m "update: 変更内容をここに記載"
```

3. GitHubにプッシュ（Vercel自動デプロイ）
```
cd /Users/chibakohei/.gemini/antigravity/scratch/sales-dx && git push origin main
```

4. 本番URL: https://proposal-viewer-zeta.vercel.app
