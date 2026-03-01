import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';

// Email list
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
    db.prepare('UPDATE emails SET status = ? WHERE id = ?').run('approved', body.email_id);
    return NextResponse.json({ success: true });
  }

  if (action === 'send') {
    // メール情報を取得
    const email = db.prepare(`
            SELECT e.*, l.email as lead_email, l.company_name
            FROM emails e
            JOIN leads l ON l.id = e.lead_id
            WHERE e.id = ?
        `).get(body.email_id) as { id: number; lead_id: number; subject: string; body_html: string; lead_email: string; company_name: string } | undefined;

    if (!email) {
      return NextResponse.json({ error: 'メールが見つかりません' }, { status: 404 });
    }

    if (!email.lead_email) {
      return NextResponse.json({ error: `${email.company_name} のメールアドレスが設定されていません。リード管理から登録してください。` }, { status: 400 });
    }

    try {
      // Resend APIで実際にメール送信
      const result = await sendEmail(email.lead_email, email.subject, email.body_html);

      // 送信成功 → DB更新
      db.prepare('UPDATE emails SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?').run('sent', body.email_id);
      db.prepare('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('proposal_sent', email.lead_id);

      return NextResponse.json({
        success: true,
        message: `${email.company_name}（${email.lead_email}）にメールを送信しました`,
        resend_id: result.id,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'メール送信中にエラーが発生しました';
      console.error('[api/emails] Send failed:', message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Create draft email
  const result = db.prepare(`
    INSERT INTO emails (lead_id, proposal_id, subject, body_html, status)
    VALUES (?, ?, ?, ?, 'draft')
  `).run(lead_id, proposal_id || null, subject, body_html);

  const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(email, { status: 201 });
}
