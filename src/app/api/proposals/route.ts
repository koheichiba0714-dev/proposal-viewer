import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateToken } from '@/lib/db';

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { lead_id, title, improvements } = body;
    const db = getDb();

    const token = generateToken();

    db.prepare(`
    INSERT INTO proposals (lead_id, token, title, improvements)
    VALUES (?, ?, ?, ?)
  `).run(lead_id, token, title || '', JSON.stringify(improvements || []));

    const proposal = db.prepare('SELECT * FROM proposals WHERE token = ?').get(token);
    return NextResponse.json(proposal, { status: 201 });
}

export async function GET() {
    const db = getDb();
    const proposals = db.prepare(`
    SELECT p.*, l.company_name, l.industry, l.area
    FROM proposals p
    JOIN leads l ON l.id = p.lead_id
    ORDER BY p.created_at DESC
  `).all();
    return NextResponse.json(proposals);
}
