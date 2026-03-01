import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// 1x1 transparent GIF pixel for email open tracking
const TRACKING_PIXEL = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
);

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const lead_id = searchParams.get('lid');
    const email_id = searchParams.get('eid');
    const type = searchParams.get('t') || 'email_open';

    if (lead_id) {
        const db = getDb();
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const ua = request.headers.get('user-agent') || '';

        db.prepare(`
      INSERT INTO tracking_events (lead_id, email_id, event_type, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).run(parseInt(lead_id), email_id ? parseInt(email_id) : null, type, ip, ua);

        // Auto-update lead status
        if (type === 'email_open') {
            db.prepare("UPDATE leads SET status = 'opened', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('proposal_sent')").run(parseInt(lead_id));
        }
    }

    return new NextResponse(TRACKING_PIXEL, {
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });
}

// POST for proposal_view / duration tracking
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lead_id, event_type, duration_seconds, token } = body;

        if (!lead_id && !token) {
            return NextResponse.json({ error: 'lead_id or token required' }, { status: 400 });
        }

        const db = getDb();
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const ua = request.headers.get('user-agent') || '';

        // Resolve lead_id from token if needed
        let resolvedLeadId = lead_id;
        if (!resolvedLeadId && token) {
            const proposal = db.prepare('SELECT lead_id FROM proposals WHERE token = ?').get(token) as { lead_id: number } | undefined;
            if (proposal) resolvedLeadId = proposal.lead_id;
        }

        if (!resolvedLeadId) {
            return NextResponse.json({ error: 'Could not resolve lead' }, { status: 400 });
        }

        if (event_type === 'duration_update' && duration_seconds) {
            // Update the latest proposal_view event's duration for this lead
            const existing = db.prepare(`
                SELECT id FROM tracking_events 
                WHERE lead_id = ? AND event_type = 'proposal_view'
                ORDER BY created_at DESC LIMIT 1
            `).get(resolvedLeadId) as { id: number } | undefined;

            if (existing) {
                db.prepare('UPDATE tracking_events SET duration_seconds = ? WHERE id = ?')
                    .run(duration_seconds, existing.id);
            }
        } else {
            // Insert new event
            db.prepare(`
                INSERT INTO tracking_events (lead_id, event_type, ip_address, user_agent, duration_seconds)
                VALUES (?, ?, ?, ?, ?)
            `).run(resolvedLeadId, event_type || 'proposal_view', ip, ua, duration_seconds || 0);

            // Auto-update lead status
            if (event_type === 'proposal_view') {
                db.prepare("UPDATE leads SET status = 'clicked', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('proposal_sent', 'opened')")
                    .run(resolvedLeadId);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[tracking POST]', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
