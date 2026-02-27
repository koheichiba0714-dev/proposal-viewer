import { NextRequest, NextResponse } from 'next/server';
import { getReport } from '@/lib/supabase';

// Try local SQLite first (for dev), fall back to Supabase (for production/Vercel)
function tryGetLocal(token: string) {
    try {
        const { getDb } = require('@/lib/db');
        const db = getDb();
        const proposal = db.prepare('SELECT * FROM proposals WHERE token = ?').get(token) as Record<string, unknown> | undefined;
        if (!proposal) return null;

        const lead = db.prepare(
            'SELECT company_name, industry, area, website_url, phone, address, sns_urls, review_count, category, sample_url FROM leads WHERE id = ?'
        ).get(proposal.lead_id as number) as Record<string, unknown> | undefined;

        const analysis = db.prepare(
            'SELECT * FROM analyses WHERE lead_id = ? ORDER BY analyzed_at DESC LIMIT 1'
        ).get(proposal.lead_id as number) as Record<string, unknown> | undefined;

        const parseJSON = (val: unknown) => {
            if (Array.isArray(val)) return val;
            if (typeof val === 'object' && val !== null) return val;
            if (typeof val !== 'string') return [];
            try { return JSON.parse(val); } catch { return []; }
        };

        return {
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
            lead_id: proposal.lead_id as number,
        };
    } catch {
        // SQLite not available (e.g., on Vercel)
        return null;
    }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    // 1. Try local SQLite (works in dev)
    const localData = tryGetLocal(token);

    if (localData) {
        // Record view event locally
        try {
            const { getDb } = require('@/lib/db');
            const db = getDb();
            const ip = _request.headers.get('x-forwarded-for') || 'unknown';
            const ua = _request.headers.get('user-agent') || '';
            db.prepare(`
                INSERT INTO tracking_events (lead_id, proposal_id, event_type, ip_address, user_agent)
                VALUES (?, ?, 'proposal_view', ?, ?)
            `).run(localData.lead_id, 0, ip, ua);
            db.prepare("UPDATE leads SET status = 'clicked', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('proposal_sent', 'opened')")
                .run(localData.lead_id);
        } catch { /* ignore tracking errors */ }

        return NextResponse.json({
            proposal: localData.proposal,
            company: localData.company,
            analysis: localData.analysis,
        });
    }

    // 2. Fall back to Supabase (works on Vercel)
    try {
        const supabaseData = await getReport(token);
        if (!supabaseData) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({
            proposal: {
                title: `${supabaseData.client_name}様 無料WEB診断レポート`,
                improvements: '[]',
                sample_url: '',
                report_html: supabaseData.content,
                created_at: new Date().toISOString(),
            },
            company: {},
            analysis: null,
        });
    } catch (err) {
        console.error('[proposals/token] Supabase fallback error:', err);
        return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
}
