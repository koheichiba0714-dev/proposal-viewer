import { NextRequest, NextResponse } from 'next/server';

/**
 * API認証ミドルウェア
 * 
 * Vercel上で管理APIを不正アクセスから保護する。
 * - ローカル開発（localhost）: 常に許可
 * - Vercel: x-api-secret ヘッダーが API_SECRET 環境変数と一致すること
 */
export function requireAuth(request: NextRequest): NextResponse | null {
    const host = request.headers.get('host') || '';

    // ローカル開発環境は常に許可
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return null; // null = 認証OK、処理続行
    }

    // API_SECRET が未設定の場合は全ブロック（Vercel上の安全策）
    const apiSecret = process.env.API_SECRET;
    if (!apiSecret) {
        console.error('[auth] API_SECRET is not set — blocking request');
        return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 503 }
        );
    }

    // x-api-secret ヘッダーチェック
    const provided = request.headers.get('x-api-secret');
    if (provided !== apiSecret) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    return null; // 認証OK
}
