import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const db = getDb();
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const analysis = db.prepare('SELECT * FROM analyses WHERE lead_id = ? ORDER BY analyzed_at DESC LIMIT 1').get(id);
    const proposals = db.prepare('SELECT * FROM proposals WHERE lead_id = ?').all(id);
    const emails = db.prepare('SELECT * FROM emails WHERE lead_id = ? ORDER BY created_at DESC').all(id);
    const events = db.prepare('SELECT * FROM tracking_events WHERE lead_id = ? ORDER BY created_at DESC').all(id);

    return NextResponse.json({ lead, analysis, proposals, emails, events });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const updates: string[] = [];
    const values: (string | number)[] = [];

    for (const [key, value] of Object.entries(body)) {
        if (['status', 'company_name', 'industry', 'area', 'phone', 'email', 'website_url', 'notes', 'score'].includes(key)) {
            updates.push(`${key} = ?`);
            values.push(value as string | number);
        }
    }

    if (updates.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(Number(id));

    db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    return NextResponse.json(lead);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const db = getDb();
    db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
}
