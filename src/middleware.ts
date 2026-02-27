import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware — APIルートのセキュリティゲート
 * 
 * 公開ルート: /api/proposals/[token], /api/tracking (tracking pixel)
 * 保護ルート: その他の全管理API（Vercel上でのみ認証必須）
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const host = request.headers.get('host') || '';

    // ─── ローカル開発は常に許可 ───
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return NextResponse.next();
    }

    // ─── 公開ルート（認証不要）───
    // 提案書閲覧: /api/proposals/[token]（32文字ランダムトークンで用推測不能）
    if (pathname.match(/^\/api\/proposals\/[a-z0-9]+$/)) {
        return NextResponse.next();
    }
    // トラッキングピクセル: /api/tracking（メール開封検知用GIF）
    if (pathname === '/api/tracking') {
        return NextResponse.next();
    }
    // フロントエンドページは全て許可
    if (!pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    // ─── 保護ルート（認証必須）───
    const apiSecret = process.env.API_SECRET;

    // API_SECRET未設定時は安全のため全ブロック
    if (!apiSecret) {
        return NextResponse.json(
            { error: 'API access disabled on this environment' },
            { status: 403 }
        );
    }

    // x-api-secret ヘッダーで認証
    const provided = request.headers.get('x-api-secret');
    if (provided !== apiSecret) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    return NextResponse.next();
}

// どのパスにミドルウェアを適用するか
export const config = {
    matcher: '/api/:path*',
};
