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
