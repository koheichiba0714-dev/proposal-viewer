import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();

  const events = db.prepare(`
    SELECT te.*, l.company_name, l.phone, l.industry, l.area
    FROM tracking_events te
    JOIN leads l ON l.id = te.lead_id
    ORDER BY te.created_at DESC
    LIMIT 100
  `).all();

  // Summary stats
  const statsRaw = db.prepare(`
    SELECT 
      event_type,
      COUNT(*) as count,
      COUNT(DISTINCT lead_id) as unique_leads
    FROM tracking_events
    GROUP BY event_type
  `).all() as { event_type: string; count: number }[];

  const summary = {
    opens: statsRaw.find((s) => s.event_type === 'email_open')?.count || 0,
    views: statsRaw.find((s) => s.event_type === 'proposal_view')?.count || 0,
    clicks: statsRaw.find((s) => s.event_type === 'proposal_click')?.count || 0,
  };

  // Hot leads — includes last_event and last_event_time for frontend
  const hotLeads = db.prepare(`
    SELECT l.id, l.company_name, l.phone, l.email, l.status, l.score,
      te_last.event_type as last_event,
      te_last.created_at as last_event_time
    FROM leads l
    JOIN (
      SELECT lead_id, event_type, created_at,
        ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY created_at DESC) as rn
      FROM tracking_events
      WHERE created_at >= datetime('now', '-7 days')
    ) te_last ON te_last.lead_id = l.id AND te_last.rn = 1
    ORDER BY te_last.created_at DESC
  `).all();

  return NextResponse.json({ events, summary, hotLeads });
}
