import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateSampleLP } from '@/lib/gemini';
import { deployToSupabase } from '@/lib/supabase';

function parseJSON(val: string | null | undefined): string[] {
    if (!val) return [];
    try { return JSON.parse(val); } catch { return []; }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
        return NextResponse.json({ error: '不正なID' }, { status: 400 });
    }

    const db = getDb();

    // Get lead
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as Record<string, unknown> | undefined;
    if (!lead) {
        return NextResponse.json({ error: 'リードが見つかりません' }, { status: 404 });
    }

    // Get analysis
    const analysis = db.prepare('SELECT * FROM analyses WHERE lead_id = ? ORDER BY analyzed_at DESC LIMIT 1').get(leadId) as Record<string, unknown> | undefined;
    if (!analysis) {
        return NextResponse.json({ error: 'サイト分析がまだ実行されていません。先にサイト分析を実行してください。' }, { status: 400 });
    }

    // Update status to generating
    db.prepare('UPDATE leads SET sample_status = ? WHERE id = ?').run('generating', leadId);

    try {
        // 1. Generate HTML via Gemini
        const issues = parseJSON(analysis.issues as string);
        const praises = parseJSON(analysis.praises as string);

        // Build rich business context from scraped data
        const snsUrls = (lead.sns_urls as string) || '';
        const hasInstagram = snsUrls.toLowerCase().includes('instagram') || snsUrls.toLowerCase().includes('instagr.am');
        const reviewCount = (lead.review_count as number) || 0;
        const category = (lead.category as string) || '';
        const notes = (lead.notes as string) || '';

        // Compose reviews info from scraped data
        const reviewsInfo = [
            notes ? `メモ/口コミ内容: ${notes}` : '',
            reviewCount > 0 ? `Googleマップ口コミ数: ${reviewCount}件` : 'Googleマップ口コミ: なし',
        ].filter(Boolean).join('\n');

        // Compose business details from all available scraped data
        const businessParts = [
            category ? `Googleマップカテゴリ: ${category}` : '',
            snsUrls ? `SNS: ${snsUrls}` : 'SNS: 未検出',
            hasInstagram ? 'Instagram: あり' : 'Instagram: なし',
            `Googleマップ口コミ数: ${reviewCount}件`,
            (lead.website_url as string) ? `既存サイト: ${lead.website_url}` : '既存サイト: なし',
            praises.length > 0 ? `サイト良い点: ${praises.join('、')}` : '',
            issues.length > 0 ? `サイト課題: ${issues.join('、')}` : '',
        ].filter(Boolean).join('\n');

        const html = await generateSampleLP({
            companyName: (lead.company_name as string) || '',
            industry: (lead.industry as string) || category || '',
            area: (lead.area as string) || '',
            address: (lead.address as string) || (lead.area as string) || '',
            websiteUrl: (lead.website_url as string) || '',
            phone: (lead.phone as string) || '',
            issues,
            praises,
            recommendations: parseJSON(analysis.recommendations as string),
            reviews: reviewsInfo,
            businessDetails: businessParts,
            score: (analysis.score as number) || 0,
        });

        if (!html || html.length < 100) {
            throw new Error('HTML生成に失敗しました（出力が短すぎます）');
        }

        // 2. Deploy to Supabase → Vercel
        let sampleUrl: string;
        try {
            sampleUrl = await deployToSupabase(
                (lead.company_name as string) || `Lead ${leadId}`,
                html
            );
        } catch (supabaseErr) {
            // Supabase failed — save locally as fallback
            const fs = require('fs');
            const path = require('path');
            const localDir = path.join(process.cwd(), 'public', 'samples', String(leadId));
            fs.mkdirSync(localDir, { recursive: true });
            fs.writeFileSync(path.join(localDir, 'index.html'), html, 'utf-8');
            sampleUrl = `/samples/${leadId}/index.html`;
            console.warn('Supabaseデプロイ失敗、ローカルにフォールバック:', supabaseErr);
        }

        // 3. Save URL to DB
        db.prepare('UPDATE leads SET sample_url = ?, sample_status = ? WHERE id = ?')
            .run(sampleUrl, 'deployed', leadId);

        return NextResponse.json({
            success: true,
            sample_url: sampleUrl,
            html_length: html.length,
        });
    } catch (err) {
        db.prepare('UPDATE leads SET sample_status = ? WHERE id = ?').run('error', leadId);
        return NextResponse.json({
            error: `生成に失敗しました: ${err instanceof Error ? err.message : err}`,
        }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const leadId = parseInt(id, 10);
    const db = getDb();

    const lead = db.prepare('SELECT sample_url, sample_status FROM leads WHERE id = ?').get(leadId) as Record<string, unknown> | undefined;
    if (!lead) {
        return NextResponse.json({ error: 'リードが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({
        sample_url: lead.sample_url || '',
        sample_status: lead.sample_status || '',
    });
}
