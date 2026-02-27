import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Public proposal page data — accessed by token only (no internal IDs exposed)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const db = getDb();

    const proposal = db.prepare('SELECT * FROM proposals WHERE token = ?').get(token) as Record<string, unknown> | undefined;
    if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const lead = db.prepare(
        'SELECT company_name, industry, area, website_url, phone, address, sns_urls, review_count, category, sample_url FROM leads WHERE id = ?'
    ).get(proposal.lead_id as number) as Record<string, unknown> | undefined;

    const analysis = db.prepare(
        'SELECT * FROM analyses WHERE lead_id = ? ORDER BY analyzed_at DESC LIMIT 1'
    ).get(proposal.lead_id as number) as Record<string, unknown> | undefined;

    // Record view event
    const ip = _request.headers.get('x-forwarded-for') || 'unknown';
    const ua = _request.headers.get('user-agent') || '';
    db.prepare(`
        INSERT INTO tracking_events (lead_id, proposal_id, event_type, ip_address, user_agent)
        VALUES (?, ?, 'proposal_view', ?, ?)
    `).run(proposal.lead_id, proposal.id, ip, ua);

    // Update lead status
    db.prepare("UPDATE leads SET status = 'clicked', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('proposal_sent', 'opened')")
        .run(proposal.lead_id);

    // Parse JSON fields safely
    const parseJSON = (val: unknown) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'object' && val !== null) return val;
        if (typeof val !== 'string') return [];
        try { return JSON.parse(val); } catch { return []; }
    };

    return NextResponse.json({
        proposal: {
            title: proposal.title,
            improvements: proposal.improvements,
            sample_url: (lead?.sample_url as string) || '',
            report_html: (proposal.report_html as string) || '',
            created_at: proposal.created_at,
        },
        company: lead || {},
        analysis: analysis ? {
            score: analysis.score,
            has_ssl: analysis.has_ssl,
            is_responsive: analysis.is_responsive,
            has_ogp: analysis.has_ogp,
            has_sns_links: analysis.has_sns_links,
            has_analytics: analysis.has_analytics,
            has_structured_data: analysis.has_structured_data,
            has_proper_h1: analysis.has_proper_h1,
            has_sitemap: analysis.has_sitemap,
            has_robots_txt: analysis.has_robots_txt,
            has_viewport_meta: analysis.has_viewport_meta,
            has_favicon: analysis.has_favicon,
            has_form_cta: analysis.has_form_cta,
            has_tel_link: analysis.has_tel_link,
            has_security_headers: analysis.has_security_headers,
            has_lang_attr: analysis.has_lang_attr,
            heading_structure_ok: analysis.heading_structure_ok,
            praises: parseJSON(analysis.praises),
            issues: parseJSON(analysis.issues),
            recommendations: parseJSON(analysis.recommendations),
            category_scores: parseJSON(analysis.category_scores),
        } : null,
    });
}
