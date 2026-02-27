import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Email list & send
export async function GET() {
    const db = getDb();
    const emails = db.prepare(`
    SELECT e.*, l.company_name, l.email as lead_email
    FROM emails e
    JOIN leads l ON l.id = e.lead_id
    ORDER BY e.created_at DESC
  `).all();
    return NextResponse.json(emails);
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { lead_id, proposal_id, subject, body_html, action } = body;
    const db = getDb();

    if (action === 'approve') {
        // Approve an email
        db.prepare('UPDATE emails SET status = ? WHERE id = ?').run('approved', body.email_id);
        return NextResponse.json({ success: true });
    }

    if (action === 'send') {
        // Mark as sent (in prototype, we simulate sending)
        db.prepare('UPDATE emails SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?').run('sent', body.email_id);
        db.prepare('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT lead_id FROM emails WHERE id = ?)').run('proposal_sent', body.email_id);
        return NextResponse.json({ success: true, message: 'メール送信をシミュレートしました（プロトタイプモード）' });
    }

    // Create draft email
    const result = db.prepare(`
    INSERT INTO emails (lead_id, proposal_id, subject, body_html, status)
    VALUES (?, ?, ?, ?, 'draft')
  `).run(lead_id, proposal_id || null, subject, body_html);

    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(email, { status: 201 });
}
