import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const PROPOSAL_BASE_URL = process.env.PROPOSAL_BASE_URL || 'https://proposal-viewer-zeta.vercel.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Insert generated HTML into Supabase and return the public URL
 */
export async function deployToSupabase(
    clientName: string,
    html: string
): Promise<string> {
    const { data, error } = await supabase
        .from('proposals')
        .insert({ client_name: clientName, content: html })
        .select('id')
        .single();

    if (error || !data) {
        throw new Error(`Supabase INSERT failed: ${error?.message || 'No data returned'}`);
    }

    return `${PROPOSAL_BASE_URL}/proposal/${data.id}`;
}

/**
 * Get proposal HTML content from Supabase by proposal URL
 */
export async function getProposalContent(proposalId: string): Promise<string> {
    const { data, error } = await supabase
        .from('proposals')
        .select('content')
        .eq('id', proposalId)
        .single();

    if (error || !data) {
        throw new Error(`Supabase SELECT failed: ${error?.message || 'No data'}`);
    }

    return data.content;
}

/**
 * Update proposal HTML content in Supabase
 */
export async function updateProposalContent(proposalId: string, html: string): Promise<void> {
    const { error } = await supabase
        .from('proposals')
        .update({ content: html })
        .eq('id', proposalId);

    if (error) {
        throw new Error(`Supabase UPDATE failed: ${error.message}`);
    }
}

/**
 * Save a diagnostic report to Supabase with a token for public access
 */
export async function saveReport(token: string, reportHtml: string, clientName: string): Promise<void> {
    const { error } = await supabase
        .from('proposals')
        .upsert({
            token,
            client_name: clientName,
            content: reportHtml,
        }, { onConflict: 'token' });

    if (error) {
        // If upsert fails (token column may not exist), try insert
        const { error: insertErr } = await supabase
            .from('proposals')
            .insert({
                token,
                client_name: clientName,
                content: reportHtml,
            });
        if (insertErr) {
            throw new Error(`Supabase saveReport failed: ${insertErr.message}`);
        }
    }
}

/**
 * Get a diagnostic report from Supabase by token
 */
export async function getReport(token: string): Promise<{ content: string; client_name: string } | null> {
    const { data, error } = await supabase
        .from('proposals')
        .select('content, client_name')
        .eq('token', token)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}
