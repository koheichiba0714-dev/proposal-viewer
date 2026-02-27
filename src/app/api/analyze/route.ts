import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { analyzeSite } from '@/lib/analyzer';

export async function POST(request: NextRequest) {
  try {
    const { lead_id, url } = await request.json();
    const db = getDb();

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const result = await analyzeSite(url);

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
      lead_id,
      // SEO
      result.has_ssl ? 1 : 0, result.page_title, result.meta_description,
      result.has_proper_h1 ? 1 : 0, result.has_sitemap ? 1 : 0, result.has_robots_txt ? 1 : 0,
      result.has_structured_data ? 1 : 0, result.internal_link_count,
      result.title_length, result.description_length, JSON.stringify(result.structured_data_types),
      result.has_faq_schema ? 1 : 0, result.has_video_schema ? 1 : 0,
      result.has_canonical ? 1 : 0, result.has_hreflang ? 1 : 0, result.has_noindex ? 1 : 0, result.has_breadcrumb ? 1 : 0,
      // UX
      result.is_responsive ? 1 : 0, result.has_viewport_meta ? 1 : 0,
      result.page_size_kb, result.script_count,
      result.has_image_optimization ? 1 : 0, result.images_without_alt,
      result.has_favicon ? 1 : 0, result.has_apple_touch_icon ? 1 : 0,
      result.has_dark_mode ? 1 : 0, result.has_skeleton_screen ? 1 : 0,
      result.has_auto_carousel ? 1 : 0, result.has_autoplay_video ? 1 : 0,
      result.has_popup_overlay ? 1 : 0, result.font_size_ok ? 1 : 0,
      // Marketing
      result.has_ogp ? 1 : 0, result.has_sns_links ? 1 : 0,
      result.has_analytics ? 1 : 0, result.has_form_cta ? 1 : 0, result.has_tel_link ? 1 : 0,
      result.has_video_content ? 1 : 0, result.has_line_link ? 1 : 0,
      result.has_reviews_ugc ? 1 : 0, result.has_cookie_consent ? 1 : 0,
      // Security
      result.has_security_headers ? 1 : 0, result.has_hsts ? 1 : 0,
      result.has_x_content_type ? 1 : 0, result.has_mixed_content ? 1 : 0, result.has_sri ? 1 : 0,
      result.last_updated_text, result.cms_type,
      // Accessibility
      result.has_lang_attr ? 1 : 0, result.heading_structure_ok ? 1 : 0,
      result.has_aria ? 1 : 0, result.has_skip_link ? 1 : 0,
      // Aggregates
      JSON.stringify(result.praises), JSON.stringify(result.issues), JSON.stringify(result.recommendations),
      result.score, JSON.stringify(result.category_scores), JSON.stringify(result),
    ];

    db.prepare(`
      INSERT INTO analyses (${columns.join(',')})
      VALUES (${columns.map(() => '?').join(',')})
    `).run(...values);

    // Update lead score and status
    db.prepare('UPDATE leads SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(result.score, lead_id);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[analyze] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
