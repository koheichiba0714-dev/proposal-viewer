import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { spawn } from 'child_process';
import path from 'path';

interface ScrapeResult {
    company_name: string;
    category: string;
    phone: string;
    postal_code: string;
    address: string;
    website_url: string;
    sns_urls: string;
    review_count: number;
    latitude: number | null;
    longitude: number | null;
    google_maps_url: string;
    area: string;
    industry: string;
}

// Store running scrape state in memory
let currentScrape: {
    running: boolean;
    logs: string[];
    progress: string;
    startedAt: number;
} = { running: false, logs: [], progress: '', startedAt: 0 };

export function getScrapeStatus() {
    return { ...currentScrape, logs: [...currentScrape.logs.slice(-50)] };
}

export async function POST(request: NextRequest) {
    if (currentScrape.running) {
        return NextResponse.json({ error: 'スクレイピングが既に実行中です' }, { status: 409 });
    }

    const body = await request.json();
    const { keyword, cities, headless = true, maxPages = 5 } = body;

    if (!keyword || !cities || !Array.isArray(cities) || cities.length === 0) {
        return NextResponse.json({ error: 'keyword と cities（配列）が必要です' }, { status: 400 });
    }

    // Start scraping in background
    currentScrape = { running: true, logs: [], progress: '開始中...', startedAt: Date.now() };

    const scriptPath = path.join(process.cwd(), 'scripts', 'scraper.py');

    const args = [
        scriptPath,
        '--keyword', keyword,
        '--cities', JSON.stringify(cities),
        '--max-pages', String(maxPages),
    ];
    if (headless) args.push('--headless');

    const proc = spawn('/usr/bin/python3', args, {
        cwd: process.cwd(),
        env: {
            ...process.env,
            PATH: `/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:${process.env.PATH || ''}`,
            PYTHONUNBUFFERED: '1',
        },
    });

    let stdout = '';
    let stderrBuf = '';

    proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderrBuf += chunk;
        const lines = chunk.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
            currentScrape.logs.push(line);
            currentScrape.progress = line;
        }
    });

    proc.on('close', (code: number | null) => {
        if (code !== 0) {
            currentScrape.logs.push(`❌ プロセス終了コード: ${code}`);
            if (stdout.trim()) {
                currentScrape.logs.push(`stdout: ${stdout.slice(-500)}`);
            }
            currentScrape.progress = 'エラーで終了';
            currentScrape.running = false;
            return;
        }

        try {
            const results: ScrapeResult[] = JSON.parse(stdout);
            const db = getDb();

            const insertStmt = db.prepare(`
        INSERT INTO leads (company_name, industry, area, phone, website_url, google_maps_url,
          category, postal_code, address, sns_urls, review_count, latitude, longitude, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'google_maps')
      `);

            const checkStmt = db.prepare(`
        SELECT id FROM leads WHERE company_name = ? AND (phone = ? OR (phone = '' AND ? = ''))
      `);

            let added = 0;
            let skipped = 0;
            const newLeadIds: number[] = [];

            const insertAll = db.transaction(() => {
                for (const r of results) {
                    if (!r.company_name) { skipped++; continue; }

                    // Duplicate check
                    const existing = checkStmt.get(r.company_name, r.phone || '', r.phone || '');
                    if (existing) { skipped++; continue; }

                    const info = insertStmt.run(
                        r.company_name, r.industry || '', r.area || '', r.phone || '',
                        r.website_url || '', r.google_maps_url || '',
                        r.category || '', r.postal_code || '', r.address || '',
                        r.sns_urls || '', r.review_count || 0,
                        r.latitude, r.longitude
                    );
                    if (r.website_url) {
                        newLeadIds.push(Number(info.lastInsertRowid));
                    }
                    added++;
                }
            });

            insertAll();

            currentScrape.logs.push(`✅ 完了: ${added}件追加, ${skipped}件スキップ（重複/無効）`);
            currentScrape.progress = `完了: ${added}件追加`;

            // Auto-analyze all new leads with website URLs (FREE — no API cost)
            if (newLeadIds.length > 0) {
                currentScrape.logs.push(`🔍 ${newLeadIds.length}件のサイト分析を自動実行中...`);
                import('@/lib/auto-analyze').then(({ autoAnalyzeLeads }) => {
                    autoAnalyzeLeads(newLeadIds).then(() => {
                        currentScrape.logs.push(`✅ 自動分析完了: ${newLeadIds.length}件`);
                    }).catch(err => {
                        currentScrape.logs.push(`⚠️ 自動分析で一部エラー: ${err}`);
                    });
                });
            }
        } catch (e) {
            currentScrape.logs.push(`❌ JSON解析エラー: ${e}`);
            currentScrape.progress = 'JSONエラー';
        }
        currentScrape.running = false;
    });

    proc.on('error', (err: Error) => {
        currentScrape.logs.push(`❌ プロセスエラー: ${err.message}`);
        currentScrape.progress = 'エラー';
        currentScrape.running = false;
    });

    return NextResponse.json({
        message: 'スクレイピングを開始しました',
        keyword,
        cities: cities.length,
    });
}
