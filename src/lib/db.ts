import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'sales-dx.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDb(db);
    migrateDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      industry TEXT NOT NULL DEFAULT '',
      area TEXT NOT NULL DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      website_url TEXT DEFAULT '',
      google_maps_url TEXT DEFAULT '',
      score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'new' CHECK(status IN ('new','analyzed','proposal_sent','opened','clicked','called','appointed','rejected')),
      notes TEXT DEFAULT '',
      call_memo TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      -- SEO基盤
      has_ssl INTEGER DEFAULT 0,
      page_title TEXT DEFAULT '',
      meta_description TEXT DEFAULT '',
      has_proper_h1 INTEGER DEFAULT 0,
      has_sitemap INTEGER DEFAULT 0,
      has_robots_txt INTEGER DEFAULT 0,
      has_structured_data INTEGER DEFAULT 0,
      internal_link_count INTEGER DEFAULT 0,
      -- UX/モバイル
      is_responsive INTEGER DEFAULT 0,
      has_viewport_meta INTEGER DEFAULT 0,
      page_size_kb INTEGER DEFAULT 0,
      script_count INTEGER DEFAULT 0,
      has_image_optimization INTEGER DEFAULT 0,
      images_without_alt INTEGER DEFAULT 0,
      has_favicon INTEGER DEFAULT 0,
      has_apple_touch_icon INTEGER DEFAULT 0,
      -- 集客・マーケ
      has_ogp INTEGER DEFAULT 0,
      has_sns_links INTEGER DEFAULT 0,
      has_analytics INTEGER DEFAULT 0,
      has_form_cta INTEGER DEFAULT 0,
      has_tel_link INTEGER DEFAULT 0,
      -- セキュリティ・保守
      has_security_headers INTEGER DEFAULT 0,
      last_updated_text TEXT DEFAULT '',
      cms_type TEXT DEFAULT '',
      -- アクセシビリティ
      has_lang_attr INTEGER DEFAULT 0,
      heading_structure_ok INTEGER DEFAULT 0,
      -- 集計
      praises TEXT DEFAULT '[]',
      issues TEXT DEFAULT '[]',
      score INTEGER DEFAULT 0,
      category_scores TEXT DEFAULT '{}',
      raw_data TEXT DEFAULT '{}',
      analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      title TEXT DEFAULT '',
      improvements TEXT DEFAULT '[]',
      competitor_data TEXT DEFAULT '[]',
      market_data TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      proposal_id INTEGER REFERENCES proposals(id),
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','approved','sent')),
      sequence_order INTEGER DEFAULT 1,
      scheduled_at DATETIME,
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tracking_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      email_id INTEGER REFERENCES emails(id),
      proposal_id INTEGER REFERENCES proposals(id),
      event_type TEXT NOT NULL CHECK(event_type IN ('email_open','proposal_view','proposal_click')),
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      duration_seconds INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
    CREATE INDEX IF NOT EXISTS idx_tracking_lead ON tracking_events(lead_id);
    CREATE INDEX IF NOT EXISTS idx_proposals_token ON proposals(token);
  `);
}

// Safe migration — adds columns if they don't already exist
function migrateDb(db: Database.Database) {
  const addCol = (table: string, col: string, type: string, dflt: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type} DEFAULT ${dflt}`);
    } catch {
      // column already exists — ignore
    }
  };

  // leads
  addCol('leads', 'call_memo', 'TEXT', "''");
  addCol('leads', 'category', 'TEXT', "''");
  addCol('leads', 'postal_code', 'TEXT', "''");
  addCol('leads', 'address', 'TEXT', "''");
  addCol('leads', 'sns_urls', 'TEXT', "''");
  addCol('leads', 'review_count', 'INTEGER', '0');
  addCol('leads', 'latitude', 'REAL', 'NULL');
  addCol('leads', 'longitude', 'REAL', 'NULL');
  addCol('leads', 'source', 'TEXT', "'manual'");
  addCol('leads', 'sample_url', 'TEXT', "''");
  addCol('leads', 'sample_status', 'TEXT', "''");
  addCol('leads', 'report_progress', 'TEXT', "''");

  // analyses — new 21-item fields
  addCol('analyses', 'has_proper_h1', 'INTEGER', '0');
  addCol('analyses', 'has_sitemap', 'INTEGER', '0');
  addCol('analyses', 'has_robots_txt', 'INTEGER', '0');
  addCol('analyses', 'internal_link_count', 'INTEGER', '0');
  addCol('analyses', 'page_size_kb', 'INTEGER', '0');
  addCol('analyses', 'script_count', 'INTEGER', '0');
  addCol('analyses', 'has_image_optimization', 'INTEGER', '0');
  addCol('analyses', 'images_without_alt', 'INTEGER', '0');
  addCol('analyses', 'has_favicon', 'INTEGER', '0');
  addCol('analyses', 'has_apple_touch_icon', 'INTEGER', '0');
  addCol('analyses', 'has_form_cta', 'INTEGER', '0');
  addCol('analyses', 'has_tel_link', 'INTEGER', '0');
  addCol('analyses', 'has_security_headers', 'INTEGER', '0');
  addCol('analyses', 'cms_type', 'TEXT', "''");
  addCol('analyses', 'has_lang_attr', 'INTEGER', '0');
  addCol('analyses', 'heading_structure_ok', 'INTEGER', '0');
  addCol('analyses', 'category_scores', 'TEXT', "'{}'");
  addCol('analyses', 'praises', 'TEXT', "'[]'");

  // analyses — 50+ item expansion
  addCol('analyses', 'recommendations', 'TEXT', "'[]'");
  addCol('analyses', 'title_length', 'INTEGER', '0');
  addCol('analyses', 'description_length', 'INTEGER', '0');
  addCol('analyses', 'structured_data_types', 'TEXT', "'[]'");
  addCol('analyses', 'has_faq_schema', 'INTEGER', '0');
  addCol('analyses', 'has_video_schema', 'INTEGER', '0');
  addCol('analyses', 'has_canonical', 'INTEGER', '0');
  addCol('analyses', 'has_hreflang', 'INTEGER', '0');
  addCol('analyses', 'has_noindex', 'INTEGER', '0');
  addCol('analyses', 'has_breadcrumb', 'INTEGER', '0');
  addCol('analyses', 'has_dark_mode', 'INTEGER', '0');
  addCol('analyses', 'has_skeleton_screen', 'INTEGER', '0');
  addCol('analyses', 'has_auto_carousel', 'INTEGER', '0');
  addCol('analyses', 'has_autoplay_video', 'INTEGER', '0');
  addCol('analyses', 'has_popup_overlay', 'INTEGER', '0');
  addCol('analyses', 'font_size_ok', 'INTEGER', '1');
  addCol('analyses', 'has_video_content', 'INTEGER', '0');
  addCol('analyses', 'has_line_link', 'INTEGER', '0');
  addCol('analyses', 'has_reviews_ugc', 'INTEGER', '0');
  addCol('analyses', 'has_cookie_consent', 'INTEGER', '0');
  addCol('analyses', 'has_hsts', 'INTEGER', '0');
  addCol('analyses', 'has_x_content_type', 'INTEGER', '0');
  addCol('analyses', 'has_mixed_content', 'INTEGER', '0');
  addCol('analyses', 'has_sri', 'INTEGER', '0');
  addCol('analyses', 'has_aria', 'INTEGER', '0');
  addCol('analyses', 'has_skip_link', 'INTEGER', '0');

  // emails
  addCol('emails', 'sequence_order', 'INTEGER', '1');
  addCol('emails', 'scheduled_at', 'DATETIME', 'NULL');

  // proposals — sample HTML storage
  addCol('proposals', 'sample_html', 'TEXT', "''");
  addCol('proposals', 'report_html', 'TEXT', "''");
}

// Helper: generate unique token
export function generateToken(): string {
  return Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join('');
}
