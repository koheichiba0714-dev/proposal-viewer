import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const leads = db.prepare(`
    SELECT l.*, 
      (SELECT COUNT(*) FROM tracking_events te WHERE te.lead_id = l.id AND te.event_type = 'email_open') as open_count,
      (SELECT COUNT(*) FROM tracking_events te WHERE te.lead_id = l.id AND te.event_type = 'proposal_view') as view_count
    FROM leads l
    ORDER BY l.id DESC
  `).all();

  // Gather unique industries and areas for filter dropdowns
  const industries = (db.prepare("SELECT DISTINCT industry FROM leads WHERE industry != '' ORDER BY industry").all() as { industry: string }[])
    .map(r => r.industry);
  const areas = (db.prepare("SELECT DISTINCT area FROM leads WHERE area != '' ORDER BY area").all() as { area: string }[])
    .map(r => r.area);

  return NextResponse.json({ data: leads, meta: { industries, areas } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  const { company_name, industry, area, phone, email, website_url, google_maps_url, notes } = body;

  const result = db.prepare(`
    INSERT INTO leads (company_name, industry, area, phone, email, website_url, google_maps_url, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(company_name, industry || '', area || '', phone || '', email || '', website_url || '', google_maps_url || '', notes || '');

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid);

  // Auto-analyze if website URL provided (FREE — no API cost)
  if (website_url) {
    const leadId = Number(result.lastInsertRowid);
    import('@/lib/auto-analyze').then(({ autoAnalyzeLeads }) => {
      autoAnalyzeLeads([leadId]).catch(err =>
        console.warn('[auto-analyze] Manual add analysis failed:', err)
      );
    });
  }

  return NextResponse.json(lead, { status: 201 });
}
