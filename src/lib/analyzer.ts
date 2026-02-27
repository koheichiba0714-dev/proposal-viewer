// Website analysis engine — 50+ item comprehensive check
// Zero-cost: uses fetch + HTML parsing, no API keys needed

export interface AnalysisResult {
    // === SEO基盤 (30点) ===
    has_ssl: boolean;
    page_title: string;
    title_length: number;
    meta_description: string;
    description_length: number;
    has_proper_h1: boolean;
    has_sitemap: boolean;
    has_robots_txt: boolean;
    has_structured_data: boolean;
    structured_data_types: string[];
    has_faq_schema: boolean;
    has_video_schema: boolean;
    has_canonical: boolean;
    has_hreflang: boolean;
    has_noindex: boolean;
    internal_link_count: number;
    has_breadcrumb: boolean;

    // === UX/モバイル (25点) ===
    is_responsive: boolean;
    has_viewport_meta: boolean;
    page_size_kb: number;
    script_count: number;
    has_image_optimization: boolean;
    images_without_alt: number;
    has_favicon: boolean;
    has_apple_touch_icon: boolean;
    has_dark_mode: boolean;
    has_skeleton_screen: boolean;
    has_auto_carousel: boolean;
    has_autoplay_video: boolean;
    has_popup_overlay: boolean;
    font_size_ok: boolean;

    // === 集客・マーケ (25点) ===
    has_ogp: boolean;
    has_sns_links: boolean;
    has_analytics: boolean;
    has_form_cta: boolean;
    has_tel_link: boolean;
    has_video_content: boolean;
    has_line_link: boolean;
    has_reviews_ugc: boolean;
    has_cookie_consent: boolean;

    // === セキュリティ・保守 (10点) ===
    has_security_headers: boolean;
    has_hsts: boolean;
    has_x_content_type: boolean;
    has_mixed_content: boolean;
    has_sri: boolean;
    last_updated_text: string;
    cms_type: string;

    // === アクセシビリティ (10点) ===
    has_lang_attr: boolean;
    heading_structure_ok: boolean;
    has_aria: boolean;
    has_skip_link: boolean;

    // === 集計 ===
    praises: string[];
    issues: string[];
    recommendations: string[];
    score: number;
    category_scores: CategoryScores;
}

export interface CategoryScores {
    seo: number;
    ux: number;
    marketing: number;
    security: number;
    accessibility: number;
}

export async function analyzeSite(url: string): Promise<AnalysisResult> {
    const result: AnalysisResult = {
        has_ssl: false,
        page_title: '',
        title_length: 0,
        meta_description: '',
        description_length: 0,
        has_proper_h1: false,
        has_sitemap: false,
        has_robots_txt: false,
        has_structured_data: false,
        structured_data_types: [],
        has_faq_schema: false,
        has_video_schema: false,
        has_canonical: false,
        has_hreflang: false,
        has_noindex: false,
        internal_link_count: 0,
        has_breadcrumb: false,
        is_responsive: false,
        has_viewport_meta: false,
        page_size_kb: 0,
        script_count: 0,
        has_image_optimization: false,
        images_without_alt: 0,
        has_favicon: false,
        has_apple_touch_icon: false,
        has_dark_mode: false,
        has_skeleton_screen: false,
        has_auto_carousel: false,
        has_autoplay_video: false,
        has_popup_overlay: false,
        font_size_ok: true,
        has_ogp: false,
        has_sns_links: false,
        has_analytics: false,
        has_form_cta: false,
        has_tel_link: false,
        has_video_content: false,
        has_line_link: false,
        has_reviews_ugc: false,
        has_cookie_consent: false,
        has_security_headers: false,
        has_hsts: false,
        has_x_content_type: false,
        has_mixed_content: false,
        has_sri: false,
        last_updated_text: '',
        cms_type: '',
        has_lang_attr: false,
        heading_structure_ok: false,
        has_aria: false,
        has_skip_link: false,
        praises: [],
        issues: [],
        recommendations: [],
        score: 0,
        category_scores: { seo: 0, ux: 0, marketing: 0, security: 0, accessibility: 0 },
    };

    try {
        // ===== FETCH =====
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        });
        clearTimeout(timeout);

        const html = await response.text();

        // ============================================================
        // ===== SEO基盤 (30点) — Google検索で見つけてもらうための基本設定 =====
        // ============================================================

        // 1. SSL暗号化通信 (5点)
        // → サイトの通信が暗号化されているか（URLが https:// で始まるか）
        result.has_ssl = url.startsWith('https://');
        if (result.has_ssl) {
            result.praises.push('🔒 通信が暗号化されています（https対応）。お客様が安心してサイトを閲覧できます');
        } else {
            result.issues.push('⚠️ 通信が暗号化されていません（http）。ブラウザに「保護されていない通信」と警告が表示され、お客様が不安を感じます');
        }

        // 2. ページタイトル (3点)
        // → Google検索結果に表示されるタイトル。35文字以内が推奨
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        result.page_title = titleMatch ? titleMatch[1].trim() : '';
        result.title_length = result.page_title.length;
        if (!result.page_title) {
            result.issues.push('❌ ページタイトルが設定されていません。Google検索結果にサイト名が正しく表示されず、クリックされにくくなります');
        } else if (result.title_length > 35) {
            result.issues.push(`📝 ページタイトルが${result.title_length}文字あります。Google検索では35文字程度までしか表示されないため、大事なキーワードを前半に入れましょう`);
        } else {
            result.praises.push(`📝 ページタイトルが${result.title_length}文字で、Google検索結果にちょうど良い長さです`);
        }

        // 3. ページの説明文 (5点)
        // → Google検索結果でタイトルの下に表示される説明文
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i)
            || html.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']description["']/i);
        result.meta_description = descMatch ? descMatch[1].trim() : '';
        result.description_length = result.meta_description.length;
        if (!result.meta_description) {
            result.issues.push('❌ ページの説明文が設定されていません。Google検索結果に適切な説明が表示されず、クリック率が下がります');
        } else if (result.description_length > 120) {
            result.issues.push(`📝 ページの説明文が${result.description_length}文字あります。スマホでは80〜120文字程度が適切です`);
        } else {
            result.praises.push(`✏️ ページの説明文が${result.description_length}文字で最適な長さです`);
        }

        // 4. 見出し構造 (3点)
        // → ページの「大見出し（H1）」が正しく1つだけ設定されているか
        const h1Matches = html.match(/<h1[^>]*>/gi) || [];
        const h2Matches = html.match(/<h2[^>]*>/gi) || [];
        result.has_proper_h1 = h1Matches.length === 1;
        if (h1Matches.length === 0) {
            result.issues.push('❌ ページの大見出し（H1）が設定されていません。Googleがこのページの内容を正しく理解できません');
        } else if (h1Matches.length > 1) {
            result.issues.push(`⚠️ 大見出し（H1）が${h1Matches.length}個あります。1ページに1つが基本ルールです`);
        } else {
            result.praises.push('🏷️ 大見出しが正しく設定されており、Googleにページの内容が伝わりやすくなっています');
        }

        // 5. サイトマップ (3点)
        // → Googleにサイト内の全ページを伝えるファイル
        try {
            const sitemapUrl = new URL('/sitemap.xml', url).href;
            const sitemapRes = await fetch(sitemapUrl, {
                signal: AbortSignal.timeout(5000),
                headers: { 'User-Agent': 'Mozilla/5.0' },
            });
            result.has_sitemap = sitemapRes.ok && (await sitemapRes.text()).includes('<urlset');
        } catch {
            result.has_sitemap = false;
        }
        if (result.has_sitemap) {
            result.praises.push('🗺️ サイトマップが設置されています。Googleが全ページを効率よく見つけられます');
        } else {
            result.issues.push('⚠️ サイトマップが未設置です。Googleがサイト内のページを見落とす可能性があります');
        }

        // 6. robots.txt (3点)
        // → Googleの巡回ロボットへの指示書
        try {
            const robotsUrl = new URL('/robots.txt', url).href;
            const robotsRes = await fetch(robotsUrl, {
                signal: AbortSignal.timeout(5000),
                headers: { 'User-Agent': 'Mozilla/5.0' },
            });
            result.has_robots_txt = robotsRes.ok && (await robotsRes.text()).toLowerCase().includes('user-agent');
        } catch {
            result.has_robots_txt = false;
        }
        if (result.has_robots_txt) {
            result.praises.push('🤖 Googleの巡回ロボットへの指示書（robots.txt）が正しく設定されています');
        } else {
            result.issues.push('⚠️ Googleへの巡回指示書（robots.txt）が未設置です。検索エンジンの巡回が最適化されていません');
        }

        // 7. 構造化データ (5点)
        // → Googleの検索結果で会社名・住所・営業時間・口コミ評価などを特別表示するための設定
        result.has_structured_data = /application\/ld\+json/i.test(html) || /itemtype=["']https?:\/\/schema\.org/i.test(html);
        const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
        jsonLdBlocks.forEach(block => {
            const content = block.replace(/<\/?script[^>]*>/gi, '');
            try {
                const data = JSON.parse(content);
                const types = Array.isArray(data) ? data.map((d: { '@type'?: string }) => d['@type']).filter(Boolean) : [data['@type']].filter(Boolean);
                result.structured_data_types.push(...types as string[]);
            } catch { /* skip */ }
        });
        result.has_faq_schema = result.structured_data_types.some(t => /faq/i.test(t));
        result.has_video_schema = result.structured_data_types.some(t => /video/i.test(t));
        if (result.has_structured_data) {
            result.praises.push('📊 「よくある質問」や「会社情報」がGoogle検索結果に特別表示される設定が入っています');
            if (result.has_faq_schema) result.praises.push('❓ 「よくある質問」がGoogle検索結果に直接表示される設定がされています');
        } else {
            result.issues.push('❌ Google検索結果で会社情報を特別表示する設定がありません。競合に比べて検索結果で目立ちにくくなっています');
        }
        if (!result.has_faq_schema) {
            result.recommendations.push('💡 「よくある質問」をサイトに掲載し、Google検索で直接回答を表示させると、お客様の目に留まりやすくなります');
        }

        // 7b. 重複ページ対策
        result.has_canonical = /rel=["']canonical["']/i.test(html);
        if (result.has_canonical) {
            result.praises.push('🔗 ページの正規URLが設定されており、同じ内容のページが複数存在しても検索評価が分散しません');
        } else {
            result.issues.push('⚠️ ページの正規URL設定がありません。同じ内容が複数URLで存在する場合、検索順位が分散するリスクがあります');
        }

        // 7c. 多言語対応
        result.has_hreflang = /hreflang=/i.test(html);
        if (result.has_hreflang) {
            result.praises.push('🌐 外国語対応が設定されており、海外のお客様もスムーズにアクセスできます');
        }

        // 7d. 検索除外の誤設定チェック（重大）
        result.has_noindex = /meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
        if (result.has_noindex) {
            result.issues.push('🚨 このページはGoogleの検索結果に表示されない設定になっています！意図的でなければ、すぐに解除が必要です');
        }

        // 8. サイト内リンク (3点)
        // → サイト内の他のページへのリンク数
        const baseHost = new URL(url).hostname;
        const allLinks = html.match(/<a[^>]*href=["']([^"'#]*?)["']/gi) || [];
        result.internal_link_count = allLinks.filter(link => {
            const hrefMatch = link.match(/href=["']([^"'#]*?)["']/i);
            if (!hrefMatch) return false;
            const href = hrefMatch[1];
            if (href.startsWith('/') && !href.startsWith('//')) return true;
            try { return new URL(href).hostname === baseHost; } catch { return false; }
        }).length;
        if (result.internal_link_count >= 3) {
            result.praises.push(`🔗 サイト内リンクが${result.internal_link_count}件あり、訪問者が他のページも見てもらいやすい構造です`);
        } else {
            result.issues.push(`⚠️ サイト内リンクが${result.internal_link_count}件しかありません。他のページへの誘導が弱く、すぐに離脱される原因になります`);
        }

        // 8b. パンくずリスト（「トップ > サービス > リフォーム」のようなナビゲーション）
        result.has_breadcrumb = /BreadcrumbList/i.test(html) || /breadcrumb/i.test(html) || /パンくず/i.test(html);
        if (result.has_breadcrumb) {
            result.praises.push('🧭 パンくずリスト（現在地表示）があり、訪問者が「今どのページにいるか」がわかりやすくなっています');
        } else {
            result.recommendations.push('💡 パンくずリスト（トップ > サービス > ○○ のような現在地表示）を追加すると、お客様がサイト内で迷いにくくなります');
        }

        // ============================================================
        // ===== UX/モバイル (25点) — スマホでの見やすさ・使いやすさ =====
        // ============================================================

        // 9. スマートフォン対応 (8点)
        result.has_viewport_meta = /meta[^>]*name=["']viewport["']/i.test(html);
        result.is_responsive = result.has_viewport_meta;
        if (result.is_responsive) {
            result.praises.push('📱 スマートフォン対応済み！画面サイズに合わせてレイアウトが自動調整されます');
        } else {
            result.issues.push('🚨 スマートフォン非対応です。今やアクセスの7〜8割はスマホからです。PCサイトがそのまま縮小表示され、文字が小さく読めません');
        }

        // 10. ページの表示速度 (8点)
        result.page_size_kb = Math.round(Buffer.byteLength(html, 'utf-8') / 1024);
        result.script_count = (html.match(/<script[^>]*src=/gi) || []).length;
        if (result.page_size_kb <= 300) {
            result.praises.push(`⚡ ページの容量が${result.page_size_kb}KBと軽量で、サクサク表示されます`);
        } else if (result.page_size_kb > 500) {
            result.issues.push(`⚠️ ページの容量が${result.page_size_kb}KBと重いです。表示に時間がかかり、待ちきれずに離脱するお客様が増えます`);
        }
        if (result.script_count > 15) {
            result.issues.push(`⚠️ 外部プログラムが${result.script_count}個読み込まれています。サイトの表示が遅くなる原因です`);
        }

        // 11. 画像の最適化 (5点)
        const imgTags = html.match(/<img[^>]*>/gi) || [];
        const totalImages = imgTags.length;
        const webpImages = imgTags.filter(t => /\.(webp|avif)/i.test(t)).length;
        result.images_without_alt = imgTags.filter(t => !/alt=["'][^"']+["']/i.test(t)).length;
        result.has_image_optimization = totalImages === 0 || (webpImages / totalImages) > 0.3;
        if (result.has_image_optimization && totalImages > 0) {
            result.praises.push('🖼 画像が最新の軽量フォーマット（WebP）で保存されており、表示速度が速いです');
        } else if (totalImages > 0 && webpImages === 0) {
            result.issues.push('⚠️ 画像が古いフォーマット（JPG/PNG）のみです。最新フォーマットに変換するだけで表示速度が大幅に改善します');
        }

        // 12. ファビコン (2点)
        // → ブラウザのタブに表示される小さなアイコン
        result.has_favicon = /rel=["'](icon|shortcut icon)["']/i.test(html);
        if (result.has_favicon) {
            result.praises.push('✨ ブラウザのタブにアイコン（ファビコン）が表示されるよう設定されています');
        } else {
            result.issues.push('⚠️ ブラウザのタブにアイコンが表示されません。他のタブに埋もれて御社のサイトが見つけにくくなります');
        }

        // 13. スマホのホーム画面アイコン (2点)
        result.has_apple_touch_icon = /apple-touch-icon/i.test(html);
        if (result.has_apple_touch_icon) {
            result.praises.push('📲 スマホのホーム画面にサイトを追加した際にアイコンが正しく表示されます');
        } else {
            result.recommendations.push('💡 スマホのホーム画面追加用アイコンを設定すると、リピーターが増えやすくなります');
        }

        // 13b. ダークモード対応（参考情報、減点なし）
        result.has_dark_mode = /prefers-color-scheme\s*:\s*dark/i.test(html) || /dark-mode|dark-theme|theme-dark/i.test(html);
        if (result.has_dark_mode) {
            result.praises.push('🌙 スマホの「ダークモード（暗い画面）」にも対応しており、夜間でも見やすいです');
        }

        // 13c. 自動スライドショー検出（ユーザー体験を損なう要素）
        result.has_auto_carousel = /autoplay|auto-play|swiper.*auto|slick.*autoplay|carousel.*auto/i.test(html);
        if (result.has_auto_carousel) {
            result.issues.push('⚠️ 自動で切り替わるスライドショーを検出。お客様が読んでいる途中で切り替わるため、読みたい情報を逃してしまいます');
        }

        // 13d. 音声付き自動再生動画検出
        result.has_autoplay_video = /<video[^>]*autoplay/i.test(html) && !/<video[^>]*muted/i.test(html);
        if (result.has_autoplay_video) {
            result.issues.push('🔇 ページを開いた途端に音声付き動画が再生されます。電車内や職場で見ているお客様がびっくりして即離脱します');
        }

        // 13e. ポップアップ検出
        result.has_popup_overlay = /popup|modal-overlay|lightbox|interstitial/i.test(html);
        if (result.has_popup_overlay) {
            result.recommendations.push('💡 ポップアップ表示を検出。訪問直後のポップアップはお客様に嫌がられ、Googleの評価も下がります');
        }

        // 13f. 文字サイズチェック
        const smallFontMatch = html.match(/font-size\s*:\s*(\d+)\s*px/gi) || [];
        const tooSmallFonts = smallFontMatch.filter(f => { const s = f.match(/(\d+)/); return s && parseInt(s[1]) < 16; });
        result.font_size_ok = tooSmallFonts.length === 0;
        if (!result.font_size_ok) {
            result.issues.push('⚠️ 一部の文字が非常に小さく設定されています。スマホでは読みにくく、お客様が内容を読まずに離脱する原因になります');
        }

        // ============================================================
        // ===== 集客・マーケ (25点) — お客様を呼び込む仕掛け =====
        // ============================================================

        // 14. SNSシェア時の見え方設定 (5点)
        // → LINEやFacebookでURLを送った時に画像やタイトルが表示されるか
        result.has_ogp = /meta[^>]*property=["']og:/i.test(html);
        if (result.has_ogp) {
            result.praises.push('🌐 LINEやFacebookでURLを送った時に、画像・タイトル付きで表示される設定がされています');
        } else {
            result.issues.push('❌ LINEやFacebookでURLを送っても画像やタイトルが表示されません。URLだけでは誰もクリックしてくれません');
        }

        // 15. SNS連携 (5点)
        const snsPatterns = [
            /facebook\.com/i, /twitter\.com/i, /x\.com\/(?!ml)/i,
            /instagram\.com/i, /line\.me/i, /youtube\.com/i, /tiktok\.com/i,
        ];
        result.has_sns_links = snsPatterns.some(p => p.test(html));
        if (result.has_sns_links) {
            result.praises.push('📣 Instagram・LINE・YouTubeなどのSNSアカウントとリンクされており、集客の入口が広がっています');
        } else {
            result.issues.push('⚠️ SNSアカウントへのリンクがありません。今の時代、ホームページだけでは新規のお客様は集まりにくくなっています');
        }

        // 16. アクセス解析 (8点)
        // → 何人がサイトを見ているか、どのページが人気かを計測する仕組み
        result.has_analytics = /google-analytics\.com|googletagmanager\.com|gtag\(|ga\(|clarity\.ms|plausible\.io/i.test(html);
        if (result.has_analytics) {
            result.praises.push('📈 アクセス解析が導入済み。「月に何人がサイトを見ているか」「どのページが人気か」が確認できる状態です');
        } else {
            result.issues.push('🚨 アクセス解析が入っていません。サイトに月何人来ているか、どのページが見られているか、まったく分からない状態です');
        }

        // 17. お問い合わせ導線 (4点)
        result.has_form_cta = /<form/i.test(html) || /お問い合わせ|contact|資料請求|無料相談|見積/i.test(html);
        if (result.has_form_cta) {
            result.praises.push('📩 お問い合わせフォームや「無料相談」ボタンが設置されており、お客様がアクションを起こしやすい状態です');
        } else {
            result.issues.push('🚨 お問い合わせフォームが見当たりません。せっかくサイトを見に来たお客様が、連絡方法がわからず離脱してしまいます');
        }

        // 18. 電話番号のタップ発信 (3点)
        result.has_tel_link = /href=["']tel:/i.test(html);
        if (result.has_tel_link) {
            result.praises.push('📞 電話番号をタップするだけで発信できるようになっています。スマホユーザーに親切な設計です');
        } else {
            const hasPhone = /\d{2,4}-\d{2,4}-\d{3,4}/.test(html);
            if (hasPhone) {
                result.issues.push('⚠️ 電話番号がサイトに記載されていますが、スマホでタップしても発信できません。番号を手打ちする手間があると、お客様は途中で諦めます');
            }
        }

        // 18b. 動画コンテンツ
        result.has_video_content = /<video/i.test(html) || /youtube\.com\/embed|youtu\.be|vimeo\.com/i.test(html);
        if (result.has_video_content) {
            result.praises.push('🎬 動画コンテンツがあり、お客様の理解度と信頼感が高まります。文字だけのサイトより滞在時間が伸びます');
        } else {
            result.recommendations.push('💡 施工事例やスタッフ紹介の動画を追加すると、お客様の信頼感と滞在時間が大きく向上します');
        }

        // 18c. LINE公式アカウント
        result.has_line_link = /line\.me|lin\.ee|LINE公式|LINE@/i.test(html);
        if (result.has_line_link) {
            result.praises.push('💬 LINE公式アカウントと連携済み！日本人の9割が使うLINEで、お客様と直接つながれます');
        } else {
            result.recommendations.push('💡 LINE公式アカウントを導入すると、見込み客と直接LINEでやり取りでき、成約率が上がります');
        }

        // 18d. お客様の声・口コミ
        result.has_reviews_ugc = /Review|レビュー|口コミ|お客様の声|testimonial|施工事例/i.test(html);
        if (result.has_reviews_ugc) {
            result.praises.push('⭐ 「お客様の声」や「施工事例」が掲載されており、初めて見る方への安心材料になっています');
        } else {
            result.recommendations.push('💡 「お客様の声」「施工事例」を掲載すると、「この会社なら大丈夫」という安心感が生まれ、問い合わせ率が上がります');
        }

        // 18e. Cookie同意（参考情報、減点なし）
        result.has_cookie_consent = /cookie.*consent|cookie.*banner|cookie.*policy|gdpr|個人情報.*同意/i.test(html);
        if (result.has_cookie_consent) {
            result.praises.push('🍪 個人情報の取り扱いに関する同意表示があり、法令対応がされています');
        }

        // ============================================================
        // ===== セキュリティ・保守 (10点) — サイトの安全性と管理状態 =====
        // ============================================================

        // 19. セキュリティ対策 (3点)
        const hasXFrame = !!response.headers.get('x-frame-options');
        const hasCSP = !!response.headers.get('content-security-policy');
        result.has_x_content_type = !!response.headers.get('x-content-type-options');
        result.has_hsts = !!response.headers.get('strict-transport-security');
        result.has_security_headers = hasXFrame || hasCSP || result.has_x_content_type;
        if (result.has_security_headers) {
            result.praises.push('🛡️ 基本的なセキュリティ対策が施されており、不正アクセスへの防御があります');
        } else {
            result.issues.push('⚠️ セキュリティ対策が不十分です。悪意のある第三者にサイトを悪用されるリスクがあります');
        }
        if (result.has_hsts) {
            result.praises.push('🔐 通信の暗号化が強制されており、情報漏洩のリスクが低く抑えられています');
        } else if (result.has_ssl) {
            result.recommendations.push('💡 暗号化通信の強制設定を追加すると、お客様の個人情報をより安全に守れます');
        }

        // 19b. 暗号化の不備チェック
        if (result.has_ssl) {
            const httpResources = html.match(/(?:src|href)=["']http:\/\//gi) || [];
            result.has_mixed_content = httpResources.length > 0;
            if (result.has_mixed_content) {
                result.issues.push(`⚠️ サイト内に暗号化されていない画像やファイルが${httpResources.length}件あります。ブラウザに警告が表示される可能性があります`);
            }
        }

        // 19c. 外部プログラムの改ざん対策
        const externalScripts = (html.match(/<script[^>]*src=["']https?:/gi) || []).length;
        const sriScripts = (html.match(/integrity=["']/gi) || []).length;
        result.has_sri = externalScripts > 0 && sriScripts > 0;

        // 20. サイトの更新状況 (4点)
        const datePatterns = html.match(/(\d{4})[年\/\-.](\d{1,2})[月\/\-.](\d{1,2})/g);
        if (datePatterns && datePatterns.length > 0) {
            const dates = datePatterns.map(d => {
                const m = d.match(/(\d{4})[年\/\-.](\d{1,2})[月\/\-.](\d{1,2})/);
                if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
                return new Date(0);
            }).filter(d => d.getTime() > 0 && d.getTime() < Date.now())
                .sort((a, b) => b.getTime() - a.getTime());

            if (dates.length > 0) {
                const latest = dates[0];
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24));
                result.last_updated_text = latest.toISOString().split('T')[0];

                if (diffDays <= 180) {
                    result.praises.push(`📅 サイトが定期的に更新されています（最終更新: ${result.last_updated_text}）。「生きたサイト」として信頼を得られています`);
                } else if (diffDays > 365) {
                    result.issues.push(`🚨 サイトの情報が${Math.floor(diffDays / 30)}ヶ月以上更新されていません（最終: ${result.last_updated_text}）。「この会社、まだやってるの？」とお客様に不安を与えます`);
                } else {
                    result.issues.push(`⚠️ サイトの新着情報が${diffDays}日以上更新されていません（最終: ${result.last_updated_text}）。定期的な更新がGoogleの評価にも影響します`);
                }
            }
        } else {
            result.issues.push('⚠️ サイトに日付の情報が見当たりません。「最新情報」や「お知らせ」がないと、放置されたサイトに見えてしまいます');
        }

        // 21. 使用システム判定（参考情報、減点なし）
        if (/wp-content|wp-includes|wordpress/i.test(html)) {
            result.cms_type = 'WordPress';
        } else if (/wix\.com|wixsite/i.test(html)) {
            result.cms_type = 'Wix';
        } else if (/squarespace/i.test(html)) {
            result.cms_type = 'Squarespace';
        } else if (/shopify/i.test(html)) {
            result.cms_type = 'Shopify';
        } else if (/jimdo/i.test(html)) {
            result.cms_type = 'Jimdo';
        } else if (/studio\.design|studio\.site/i.test(html)) {
            result.cms_type = 'STUDIO';
        } else if (/ameba|ameblo/i.test(html)) {
            result.cms_type = 'Ameba';
        } else if (/goope\.jp/i.test(html)) {
            result.cms_type = 'グーペ';
        } else if (/peraichi/i.test(html)) {
            result.cms_type = 'ペライチ';
        } else {
            result.cms_type = 'オリジナル/不明';
        }

        // ============================================================
        // ===== アクセシビリティ (10点) — 誰でも使いやすいサイトか =====
        // ============================================================

        // 言語設定 (3点)
        result.has_lang_attr = /<html[^>]*lang=/i.test(html);
        if (result.has_lang_attr) {
            result.praises.push('🌏 サイトの言語（日本語）が正しく設定されています。音声読み上げソフトが正確に日本語を読みます');
        } else {
            result.issues.push('⚠️ サイトの言語設定がありません。音声読み上げソフトが英語として読んでしまう場合があります');
        }

        // 見出しの階層構造 (3点)
        result.heading_structure_ok = h1Matches.length === 1 && h2Matches.length >= 1;
        if (result.heading_structure_ok) {
            result.praises.push('📑 見出しの階層構造が正しく整理されており、内容が読みやすくなっています');
        }

        // 画像の説明文 (4点)
        if (result.images_without_alt > 0) {
            result.issues.push(`⚠️ ${result.images_without_alt}枚の画像に説明文がありません。目が不自由な方が音声読み上げソフトを使った時に画像の内容が伝わりません`);
        } else if (totalImages > 0) {
            result.praises.push(`🖼️ 全${totalImages}枚の画像に説明文が設定されており、目が不自由な方や視覚障害者にも配慮されたサイトです`);
        }

        // バリアフリー対応
        result.has_aria = /role=["']/i.test(html) || /aria-/i.test(html);
        if (result.has_aria) {
            result.praises.push('♿ バリアフリー対応がされており、視覚障害のある方も使いやすいサイトです');
        }

        // キーボード操作対応
        result.has_skip_link = /skip.*content|skip.*nav|skiplink/i.test(html);
        if (result.has_skip_link) {
            result.praises.push('⏭️ キーボードだけでもサイトを操作できる仕組みがあり、バリアフリーの意識が高いです');
        }

        // ============================================================
        // ===== 改善提案（経営者向け、わかりやすい言葉で） =====
        // ============================================================
        result.recommendations.push('📋 会社概要に「代表者の顔写真・経歴」「資格・受賞歴」を掲載すると、Googleの評価と信頼性が大きく向上します');
        result.recommendations.push('📊 Googleビジネスプロフィール（旧Googleマイビジネス）を充実させると、「地域名+業種」の検索で上位に表示されやすくなります');
        result.recommendations.push('🔄 ブログやお知らせを月2〜4回更新すると、Googleが「このサイトはちゃんと管理されている」と評価し、検索順位が上がります');
        result.recommendations.push('🧪 お問い合わせボタンの色・文言・位置を少し変えてみて、どちらが問い合わせが多いかテストすると、成約率が上がります');

        // ===== スコア計算 =====
        const cat = { seo: 30, ux: 25, marketing: 25, security: 10, accessibility: 10 };

        // SEO基盤 (30点)
        if (!result.has_ssl) cat.seo -= 4;
        if (!result.page_title) cat.seo -= 3;
        else if (result.title_length > 35) cat.seo -= 1;
        if (!result.meta_description) cat.seo -= 3;
        else if (result.description_length > 120) cat.seo -= 1;
        if (!result.has_proper_h1) cat.seo -= 2;
        if (!result.has_sitemap) cat.seo -= 2;
        if (!result.has_robots_txt) cat.seo -= 2;
        if (!result.has_structured_data) cat.seo -= 4;
        if (!result.has_canonical) cat.seo -= 2;
        if (result.internal_link_count < 3) cat.seo -= 2;
        if (result.has_noindex) cat.seo -= 5;

        // UX/モバイル (25点)
        if (!result.is_responsive) cat.ux -= 7;
        if (result.page_size_kb > 500) cat.ux -= 5;
        else if (result.page_size_kb > 300) cat.ux -= 3;
        if (!result.has_image_optimization) cat.ux -= 4;
        if (!result.has_favicon) cat.ux -= 1;
        if (!result.has_apple_touch_icon) cat.ux -= 1;
        if (result.has_auto_carousel) cat.ux -= 2;
        if (result.has_autoplay_video) cat.ux -= 2;
        if (!result.font_size_ok) cat.ux -= 2;

        // 集客・マーケ (25点)
        if (!result.has_ogp) cat.marketing -= 4;
        if (!result.has_sns_links) cat.marketing -= 3;
        if (!result.has_analytics) cat.marketing -= 6;
        if (!result.has_form_cta) cat.marketing -= 4;
        if (!result.has_tel_link) cat.marketing -= 2;
        if (!result.has_video_content) cat.marketing -= 2;
        if (!result.has_line_link) cat.marketing -= 2;
        if (!result.has_reviews_ugc) cat.marketing -= 2;

        // セキュリティ・保守 (10点)
        if (!result.has_security_headers) cat.security -= 3;
        if (!result.has_hsts && result.has_ssl) cat.security -= 2;
        if (result.has_mixed_content) cat.security -= 2;
        if (result.issues.some(i => i.includes('未更新') || i.includes('更新されていません'))) cat.security -= 3;

        // アクセシビリティ (10点)
        if (!result.has_lang_attr) cat.accessibility -= 3;
        if (!result.heading_structure_ok) cat.accessibility -= 3;
        if (result.images_without_alt > 0) cat.accessibility -= 4;

        // 正規化
        cat.seo = Math.max(0, cat.seo);
        cat.ux = Math.max(0, cat.ux);
        cat.marketing = Math.max(0, cat.marketing);
        cat.security = Math.max(0, cat.security);
        cat.accessibility = Math.max(0, cat.accessibility);

        result.category_scores = cat;
        result.score = cat.seo + cat.ux + cat.marketing + cat.security + cat.accessibility;

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.issues.push(`サイトへのアクセスに失敗しました: ${errorMessage}`);
        result.score = 0;
        result.category_scores = { seo: 0, ux: 0, marketing: 0, security: 0, accessibility: 0 };
    }

    return result;
}
