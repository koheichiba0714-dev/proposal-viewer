import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateToken } from '@/lib/db';
import { generateSampleLP, generateDiagnosticReport } from '@/lib/gemini';
import { deployToSupabase } from '@/lib/supabase';

function parseJSON(str: unknown): string[] {
    if (Array.isArray(str)) return str;
    if (typeof str !== 'string') return [];
    try { return JSON.parse(str); } catch { return []; }
}

function parseJSONObj(str: unknown): Record<string, unknown>[] {
    if (Array.isArray(str)) return str as Record<string, unknown>[];
    if (typeof str !== 'string') return [];
    try { return JSON.parse(str); } catch { return []; }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const leadId = parseInt(id, 10);
    const db = getDb();

    // 1. Fetch lead + latest analysis
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as Record<string, unknown> | undefined;
    if (!lead) {
        return NextResponse.json({ error: 'リードが見つかりません' }, { status: 404 });
    }

    const analysis = db.prepare('SELECT * FROM analyses WHERE lead_id = ? ORDER BY analyzed_at DESC LIMIT 1')
        .get(leadId) as Record<string, unknown> | undefined;
    if (!analysis) {
        return NextResponse.json({ error: '先にサイト分析を実行してください' }, { status: 400 });
    }

    // 2. Rate limit: max 3 reports per lead
    const reportCount = db.prepare('SELECT COUNT(*) as cnt FROM proposals WHERE lead_id = ?').get(leadId) as { cnt: number };
    if (reportCount.cnt >= 3) {
        return NextResponse.json({ error: 'レポート生成回数の上限（3回）に達しています' }, { status: 429 });
    }

    // Set initial progress
    db.prepare("UPDATE leads SET report_progress = 'LP生成中 (1/3)' WHERE id = ?").run(leadId);

    try {
        // 3. Build context from scraped data
        const issues = parseJSON(analysis.issues);
        const praises = parseJSON(analysis.praises);
        const recommendations = parseJSON(analysis.recommendations);

        const snsUrls = (lead.sns_urls as string) || '';
        const hasInstagram = snsUrls.toLowerCase().includes('instagram') || snsUrls.toLowerCase().includes('instagr.am');
        const reviewCount = (lead.review_count as number) || 0;
        const category = (lead.category as string) || '';
        const notes = (lead.notes as string) || '';

        const reviewsInfo = [
            notes ? `メモ/口コミ内容: ${notes}` : '',
            reviewCount > 0 ? `Googleマップ口コミ数: ${reviewCount}件` : 'Googleマップ口コミ: なし',
        ].filter(Boolean).join('\n');

        const businessParts = [
            category ? `Googleマップカテゴリ: ${category}` : '',
            snsUrls ? `SNS: ${snsUrls}` : 'SNS: 未検出',
            hasInstagram ? 'Instagram: あり' : 'Instagram: なし',
            `Googleマップ口コミ数: ${reviewCount}件`,
            (lead.website_url as string) ? `既存サイト: ${lead.website_url}` : '既存サイト: なし',
            praises.length > 0 ? `サイト良い点: ${praises.join('、')}` : '',
            issues.length > 0 ? `サイト課題: ${issues.join('、')}` : '',
        ].filter(Boolean).join('\n');

        // ============================================
        // STEP A: Generate Renewal LP via Gemini
        // ============================================
        const sampleHtml = await generateSampleLP({
            companyName: (lead.company_name as string) || '',
            industry: (lead.industry as string) || category || '',
            area: (lead.area as string) || '',
            address: (lead.address as string) || (lead.area as string) || '',
            websiteUrl: (lead.website_url as string) || '',
            phone: (lead.phone as string) || '',
            issues,
            praises,
            recommendations,
            reviews: reviewsInfo,
            businessDetails: businessParts,
            score: (analysis.score as number) || 0,
        });

        if (!sampleHtml || sampleHtml.length < 100) {
            throw new Error('リニューアルLP生成に失敗しました（出力が短すぎます）');
        }

        // ============================================
        // STEP B: Deploy LP to Supabase → Vercel
        // ============================================
        db.prepare("UPDATE leads SET report_progress = 'デプロイ中 (2/3)' WHERE id = ?").run(leadId);
        let sampleUrl: string;
        try {
            sampleUrl = await deployToSupabase(
                (lead.company_name as string) || `Lead ${leadId}`,
                sampleHtml
            );
        } catch (supabaseErr) {
            const fs = require('fs');
            const path = require('path');
            const localDir = path.join(process.cwd(), 'public', 'samples', String(leadId));
            fs.mkdirSync(localDir, { recursive: true });
            fs.writeFileSync(path.join(localDir, 'index.html'), sampleHtml, 'utf-8');
            sampleUrl = `/samples/${leadId}/index.html`;
            console.warn('Supabaseデプロイ失敗、ローカルにフォールバック:', supabaseErr);
        }

        // Save Vercel URL to leads table
        db.prepare("UPDATE leads SET sample_url = ?, sample_status = 'deployed', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(sampleUrl, leadId);

        // Delay to avoid rate limiting between 2 Gemini calls
        db.prepare("UPDATE leads SET report_progress = 'レポート生成中 (3/3)' WHERE id = ?").run(leadId);
        console.log('[generate-report] LP生成完了。レート制限回避のため15秒待機してからレポート生成を開始...');
        await new Promise(r => setTimeout(r, 15000));

        // ============================================
        // STEP C: Generate Diagnostic Report via Gemini
        // ============================================
        const checkItems = [
            { label: 'SSL（HTTPS）', pass: !!(analysis.has_ssl) },
            { label: 'レスポンシブデザイン', pass: !!(analysis.is_responsive) },
            { label: 'OGPタグ', pass: !!(analysis.has_ogp) },
            { label: 'SNS連携', pass: !!(analysis.has_sns_links) },
            { label: 'アクセス解析', pass: !!(analysis.has_analytics) },
            { label: '構造化データ', pass: !!(analysis.has_structured_data) },
            { label: 'H1見出し構造', pass: !!(analysis.has_proper_h1) },
            { label: 'sitemap.xml', pass: !!(analysis.has_sitemap) },
            { label: 'robots.txt', pass: !!(analysis.has_robots_txt) },
            { label: 'ビューポート設定', pass: !!(analysis.has_viewport_meta) },
            { label: 'ファビコン', pass: !!(analysis.has_favicon) },
            { label: 'フォーム/CTA', pass: !!(analysis.has_form_cta) },
            { label: '電話クリッカブル', pass: !!(analysis.has_tel_link) },
            { label: 'セキュリティヘッダー', pass: !!(analysis.has_security_headers) },
            { label: 'lang属性', pass: !!(analysis.has_lang_attr) },
            { label: '見出し構造', pass: !!(analysis.heading_structure_ok) },
        ];

        const rawCatScores = parseJSONObj(analysis.category_scores);
        const categoryScores = Array.isArray(rawCatScores) ? rawCatScores.map((c: Record<string, unknown>) => ({
            category: (c.category as string) || '',
            score: (c.score as number) || 0,
            maxScore: (c.maxScore as number) || 0,
        })) : [];

        const reportHtml = await generateDiagnosticReport({
            companyName: (lead.company_name as string) || '',
            industry: (lead.industry as string) || category || '',
            area: (lead.area as string) || '',
            phone: (lead.phone as string) || '',
            websiteUrl: (lead.website_url as string) || '',
            score: (analysis.score as number) || 0,
            categoryScores,
            praises,
            issues,
            recommendations,
            checks: checkItems,
            sampleUrl,
        });

        // ============================================
        // STEP D: Save everything to DB
        // ============================================
        const token = generateToken();
        db.prepare(`
            INSERT INTO proposals (lead_id, token, title, improvements, report_html)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            leadId,
            token,
            `${(lead.company_name as string) || '企業'}様 無料WEB診断レポート`,
            JSON.stringify(issues.map((issue: string) => ({
                issue,
                suggestion: recommendations.find((r: string) => {
                    const w = issue.split(/[：:、。\s]/).filter(s => s.length >= 2);
                    return w.some(s => r.includes(s));
                }) || '改善対応を推奨',
            }))),
            reportHtml
        );

        db.prepare("UPDATE leads SET status = 'proposal_sent', report_progress = '完了', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(leadId);

        return NextResponse.json({
            success: true,
            token,
            proposal_url: `/proposals/${token}`,
            sample_url: sampleUrl,
        });
    } catch (err) {
        db.prepare("UPDATE leads SET report_progress = 'エラー' WHERE id = ?").run(leadId);
        return NextResponse.json({
            error: `レポート生成に失敗しました: ${err instanceof Error ? err.message : err}`,
        }, { status: 500 });
    }
}
