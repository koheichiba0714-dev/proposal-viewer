import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateSalesEmail } from '@/lib/gemini';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const db = getDb();

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(id)) as {
        id: number; company_name: string; industry: string; area: string;
        phone: string; email: string; website_url: string; score: number;
    } | undefined;

    if (!lead) {
        return NextResponse.json({ error: 'リードが見つかりません' }, { status: 404 });
    }

    // Get analysis data
    const analysis = db.prepare('SELECT * FROM analyses WHERE lead_id = ? ORDER BY analyzed_at DESC LIMIT 1').get(Number(id)) as {
        score: number; praises: string; issues: string; instagram_url?: string; facebook_url?: string;
    } | undefined;

    // Get latest proposal for the URL
    const proposal = db.prepare('SELECT * FROM proposals WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1').get(Number(id)) as {
        token: string;
    } | undefined;

    if (!proposal) {
        return NextResponse.json({ error: '診断レポートがまだ生成されていません。先にレポートを生成してください。' }, { status: 400 });
    }

    const proposalUrl = `https://proposal-viewer-zeta.vercel.app/proposals/${proposal.token}`;

    // Parse issues and praises
    let issues: string[] = [];
    let praises: string[] = [];
    if (analysis) {
        try { issues = JSON.parse(analysis.issues || '[]'); } catch { issues = []; }
        try { praises = JSON.parse(analysis.praises || '[]'); } catch { praises = []; }
    }

    try {
        const result = await generateSalesEmail({
            companyName: lead.company_name,
            industry: lead.industry,
            area: lead.area,
            websiteUrl: lead.website_url,
            score: analysis?.score || lead.score || 0,
            issues,
            praises,
            proposalUrl,
            instagramUrl: analysis?.instagram_url || '',
            facebookUrl: analysis?.facebook_url || '',
        });

        // Add tracking pixel to the email body
        const trackingPixel = `<img src="https://proposal-viewer-zeta.vercel.app/api/tracking?lid=${lead.id}&t=email_open" width="1" height="1" style="display:none" />`;
        const bodyWithTracking = result.bodyHtml + trackingPixel;

        return NextResponse.json({
            subject: result.subject,
            body_html: bodyWithTracking,
            proposal_url: proposalUrl,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'セールスレター生成に失敗しました';
        console.error('[generate-email] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
