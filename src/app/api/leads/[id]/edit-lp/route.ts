import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { editLP } from '@/lib/gemini';
import { getProposalContent, updateProposalContent } from '@/lib/supabase';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
        return NextResponse.json({ error: '不正なID' }, { status: 400 });
    }

    const body = await request.json();
    const { message } = body;
    if (!message || typeof message !== 'string') {
        return NextResponse.json({ error: '編集指示を入力してください' }, { status: 400 });
    }

    const db = getDb();
    const lead = db.prepare('SELECT sample_url FROM leads WHERE id = ?').get(leadId) as Record<string, unknown> | undefined;
    if (!lead?.sample_url) {
        return NextResponse.json({ error: 'サンプルLPがまだ生成されていません。先にURL発行してください。' }, { status: 400 });
    }

    // Extract proposal UUID from URL
    const sampleUrl = lead.sample_url as string;
    const uuidMatch = sampleUrl.match(/\/proposal\/([a-f0-9-]+)/);
    if (!uuidMatch) {
        return NextResponse.json({ error: 'Supabase上のLPではありません（ローカルLPは編集できません）' }, { status: 400 });
    }
    const proposalId = uuidMatch[1];

    try {
        // 1. Fetch current HTML from Supabase
        const currentHtml = await getProposalContent(proposalId);

        // 2. Edit via Gemini
        const newHtml = await editLP(currentHtml, message);

        // 3. Update Supabase
        await updateProposalContent(proposalId, newHtml);

        return NextResponse.json({
            success: true,
            message: '✅ LPを更新しました',
            html_length: newHtml.length,
        });
    } catch (err) {
        return NextResponse.json({
            error: `編集に失敗しました: ${err instanceof Error ? err.message : err}`,
        }, { status: 500 });
    }
}
