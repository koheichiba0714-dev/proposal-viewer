import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const VALID_STATUSES = ['new', 'proposal_sent', 'opened', 'clicked', 'called', 'appointed', 'rejected'];

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { lead_ids, action, value } = body;

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
        return NextResponse.json({ error: 'lead_ids is required' }, { status: 400 });
    }

    const db = getDb();

    if (action === 'status') {
        if (!VALID_STATUSES.includes(value)) {
            return NextResponse.json({ error: `Invalid status: ${value}` }, { status: 400 });
        }

        const placeholders = lead_ids.map(() => '?').join(',');
        const stmt = db.prepare(`UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`);
        stmt.run(value, ...lead_ids);

        return NextResponse.json({ success: true, updated: lead_ids.length });
    }

    if (action === 'delete') {
        const placeholders = lead_ids.map(() => '?').join(',');
        db.prepare(`DELETE FROM leads WHERE id IN (${placeholders})`).run(...lead_ids);
        return NextResponse.json({ success: true, deleted: lead_ids.length });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
