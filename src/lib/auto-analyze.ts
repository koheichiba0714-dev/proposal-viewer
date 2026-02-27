/**
 * Auto-analyze: Run site analysis on newly added leads in the background.
 * This is completely FREE (no API calls) — uses the built-in analyzer only.
 */
import { getDb } from '@/lib/db';
import { analyzeSite } from '@/lib/analyzer';

export async function autoAnalyzeLeads(leadIds: number[]) {
    const db = getDb();

    for (const leadId of leadIds) {
        try {
            const lead = db.prepare('SELECT id, company_name, website_url, status FROM leads WHERE id = ?')
                .get(leadId) as { id: number; company_name: string; website_url: string; status: string } | undefined;

            if (!lead || !lead.website_url || lead.status !== 'new') continue;

            console.log(`[auto-analyze] 分析開始: ${lead.company_name} (${lead.website_url})`);

            const result = await analyzeSite(lead.website_url);

            const columns = [
                'lead_id',
                'has_ssl', 'page_title', 'meta_description', 'has_proper_h1', 'has_sitemap', 'has_robots_txt', 'has_structured_data', 'internal_link_count',
                'title_length', 'description_length', 'structured_data_types', 'has_faq_schema', 'has_video_schema', 'has_canonical', 'has_hreflang', 'has_noindex', 'has_breadcrumb',
                'is_responsive', 'has_viewport_meta', 'page_size_kb', 'script_count', 'has_image_optimization', 'images_without_alt', 'has_favicon', 'has_apple_touch_icon',
                'has_dark_mode', 'has_skeleton_screen', 'has_auto_carousel', 'has_autoplay_video', 'has_popup_overlay', 'font_size_ok',
                'has_ogp', 'has_sns_links', 'has_analytics', 'has_form_cta', 'has_tel_link',
                'has_video_content', 'has_line_link', 'has_reviews_ugc', 'has_cookie_consent',
                'has_security_headers', 'has_hsts', 'has_x_content_type', 'has_mixed_content', 'has_sri', 'last_updated_text', 'cms_type',
                'has_lang_attr', 'heading_structure_ok', 'has_aria', 'has_skip_link',
                'praises', 'issues', 'recommendations', 'score', 'category_scores', 'raw_data',
            ];

            const values = [
                leadId,
                result.has_ssl ? 1 : 0, result.page_title, result.meta_description,
                result.has_proper_h1 ? 1 : 0, result.has_sitemap ? 1 : 0, result.has_robots_txt ? 1 : 0,
                result.has_structured_data ? 1 : 0, result.internal_link_count,
                result.title_length, result.description_length, JSON.stringify(result.structured_data_types),
                result.has_faq_schema ? 1 : 0, result.has_video_schema ? 1 : 0,
                result.has_canonical ? 1 : 0, result.has_hreflang ? 1 : 0, result.has_noindex ? 1 : 0, result.has_breadcrumb ? 1 : 0,
                result.is_responsive ? 1 : 0, result.has_viewport_meta ? 1 : 0,
                result.page_size_kb, result.script_count,
                result.has_image_optimization ? 1 : 0, result.images_without_alt,
                result.has_favicon ? 1 : 0, result.has_apple_touch_icon ? 1 : 0,
                result.has_dark_mode ? 1 : 0, result.has_skeleton_screen ? 1 : 0,
                result.has_auto_carousel ? 1 : 0, result.has_autoplay_video ? 1 : 0,
                result.has_popup_overlay ? 1 : 0, result.font_size_ok ? 1 : 0,
                result.has_ogp ? 1 : 0, result.has_sns_links ? 1 : 0,
                result.has_analytics ? 1 : 0, result.has_form_cta ? 1 : 0, result.has_tel_link ? 1 : 0,
                result.has_video_content ? 1 : 0, result.has_line_link ? 1 : 0,
                result.has_reviews_ugc ? 1 : 0, result.has_cookie_consent ? 1 : 0,
                result.has_security_headers ? 1 : 0, result.has_hsts ? 1 : 0,
                result.has_x_content_type ? 1 : 0, result.has_mixed_content ? 1 : 0, result.has_sri ? 1 : 0,
                result.last_updated_text, result.cms_type,
                result.has_lang_attr ? 1 : 0, result.heading_structure_ok ? 1 : 0,
                result.has_aria ? 1 : 0, result.has_skip_link ? 1 : 0,
                JSON.stringify(result.praises), JSON.stringify(result.issues), JSON.stringify(result.recommendations),
                result.score, JSON.stringify(result.category_scores), JSON.stringify(result),
            ];

            db.prepare(`
                INSERT INTO analyses (${columns.join(',')})
                VALUES (${columns.map(() => '?').join(',')})
            `).run(...values);

            db.prepare('UPDATE leads SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(result.score, leadId);

            console.log(`[auto-analyze] ✅ ${lead.company_name}: ${result.score}点`);

        } catch (err) {
            console.warn(`[auto-analyze] ⚠️ Lead ${leadId} 分析失敗:`, err instanceof Error ? err.message : err);
            // Continue with next lead — don't stop the batch
        }
    }
}
