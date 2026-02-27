import { NextResponse } from 'next/server';
import { saveReport, getReport } from '@/lib/supabase';

// TEMPORARY: One-time migration to sync local report data to Supabase
// DELETE this file after running once
export async function GET() {
    const results: string[] = [];

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getDb } = require('@/lib/db');
        const db = getDb();
        const proposals = db.prepare(`
            SELECT p.token, p.report_html, l.company_name
            FROM proposals p
            JOIN leads l ON l.id = p.lead_id
            WHERE p.report_html IS NOT NULL AND p.report_html != ''
        `).all() as { token: string; report_html: string; company_name: string }[];

        results.push(`📦 Found ${proposals.length} reports to sync`);

        let synced = 0;
        let skipped = 0;
        for (const p of proposals) {
            // Check if already synced (using new token::clientName format)
            const existing = await getReport(p.token);
            if (existing) {
                results.push(`⏭ ${p.company_name} already synced`);
                skipped++;
                continue;
            }

            try {
                await saveReport(p.token, p.report_html, p.company_name);
                results.push(`✅ ${p.company_name} synced (${p.report_html.length} chars)`);
                synced++;
            } catch (err) {
                results.push(`⚠️ ${p.company_name}: ${err instanceof Error ? err.message : err}`);
            }
        }
        results.push(`\n🎉 Sync complete: ${synced} new, ${skipped} already synced`);
    } catch (err) {
        results.push(`SQLite error: ${err instanceof Error ? err.message : err}`);
    }

    return NextResponse.json({ results, success: true });
}
