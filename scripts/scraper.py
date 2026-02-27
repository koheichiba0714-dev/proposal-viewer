# -*- coding: utf-8 -*-
"""
Googleマップスクレイパー（営業DXプラットフォーム統合版）
- 元ファイル: Googleマップ_改正0109.py をMac対応 + JSON出力に改修
- CLI引数でキーワード・エリアを指定
- 結果をstdout JSONで出力（Node.js child_processから呼び出し）
- 進捗はstderrに出力
"""

import sys
import time
import json
import re
import argparse
from urllib.parse import urlparse, parse_qs, quote_plus
from contextlib import suppress

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service as ChromeService
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import (
        NoSuchElementException, TimeoutException, StaleElementReferenceException
    )
except ImportError:
    print(json.dumps({"error": "selenium is not installed. Run: pip3 install selenium"}), file=sys.stdout)
    sys.exit(1)

# ===== 設定 =====
CARD_LOAD_TIMEOUT = 30

# ===== 正規表現 =====
POSTAL_RE = re.compile(r"〒?\s?(\d{3}[-−‐]\d{4})")
TEL_RE = re.compile(r"0\d{1,4}[-−‐]?\d{1,4}[-−‐]?\d{3,4}")
REVIEWS_RE = re.compile(r"(\d[\d,\.]*)\s*件のクチコミ")

COORD_URL_PATTERNS = [
    r"/@([\-0-9\.]+),([\-0-9\.]+),",
    r"!3d([\-0-9\.]+)!4d([\-0-9\.]+)",
    r"!2d([\-0-9\.]+)!3d([\-0-9\.]+)",
]

SOCIAL_DOMAINS = (
    "facebook.com", "instagram.com", "twitter.com", "x.com", "line.me", "lin.ee",
    "youtube.com", "tiktok.com", "ameblo.jp", "note.com", "threads.net",
    "pinterest.com", "linkedin.com"
)
BLOCK_WEBSITE_NETLOCS = (
    "google.com", "google.co.jp", "maps.google.com", "maps.app.goo.gl",
    "goo.gl", "support.google.com"
)

def log(msg):
    """進捗をstderrに出力（Node.js側で読み取る）"""
    print(msg, file=sys.stderr, flush=True)

# ===== ユーティリティ =====
def normalize_hyphen(s):
    if not s: return s
    return re.sub(r"[−‐\-‒–—―ー−]", "-", s)

def safe_text(el):
    try: return el.text.strip()
    except Exception: return ""

def wait_css(drv, css, timeout=12):
    return WebDriverWait(drv, timeout).until(EC.presence_of_element_located((By.CSS_SELECTOR, css)))

def find_first(drv, selectors):
    for by, sel in selectors:
        try:
            el = drv.find_element(by, sel)
            if el: return el
        except NoSuchElementException:
            continue
    return None

def clean_href(href):
    if not href: return ""
    href = href.strip()
    if href.startswith("https://www.google.com/url?") or href.startswith("https://www.google.co.jp/url?"):
        try:
            q = parse_qs(urlparse(href).query).get("q", [""])[0]
            if q: href = q
        except Exception:
            pass
    return href.split("&ved=")[0]

def is_social_url(href):
    try: netloc = urlparse(href).netloc.lower()
    except Exception: return False
    return any(d in netloc for d in SOCIAL_DOMAINS)

def is_block_website(href):
    try: netloc = urlparse(href).netloc.lower()
    except Exception: return True
    return any(netloc.endswith(d) or netloc == d for d in BLOCK_WEBSITE_NETLOCS)

# ===== Google同意画面処理 =====
def handle_google_consent(driver, timeout=10):
    btn_xpaths = [
        '//button[contains(.,"同意して続行")]',
        '//button[contains(.,"同意する")]',
        '//div[@role="button" and contains(.,"同意")]',
        '//button[contains(.,"I agree") or contains(.,"Accept all")]',
        '//div[@role="button" and (contains(.,"I agree") or contains(.,"Accept"))]'
    ]
    end = time.time() + timeout
    while time.time() < end:
        for xp in btn_xpaths:
            with suppress(Exception):
                for el in driver.find_elements(By.XPATH, xp):
                    if el.is_displayed() and el.is_enabled():
                        el.click(); time.sleep(0.5); return True
        frames = []
        with suppress(Exception):
            frames = driver.find_elements(By.TAG_NAME, "iframe")
        for fr in frames:
            with suppress(Exception):
                driver.switch_to.frame(fr)
                for xp in btn_xpaths:
                    for el in driver.find_elements(By.XPATH, xp):
                        if el.is_displayed() and el.is_enabled():
                            el.click(); time.sleep(0.5)
                            driver.switch_to.default_content(); return True
                driver.switch_to.default_content()
        time.sleep(0.4)
    with suppress(Exception):
        driver.switch_to.default_content()
    return False

def open_maps_home(driver, max_attempts=3):
    MAPS_URL = "https://www.google.co.jp/maps?hl=ja"
    for attempt in range(1, max_attempts + 1):
        driver.get(MAPS_URL)
        with suppress(Exception):
            handle_google_consent(driver, timeout=8)
        try:
            WebDriverWait(driver, 15).until(EC.any_of(
                EC.presence_of_element_located((By.ID, "searchboxinput")),
                EC.presence_of_element_located((By.XPATH, '//input[@aria-label="検索 Google マップ" or @aria-label="Search Google Maps"]'))
            ))
            return True
        except TimeoutException:
            with suppress(Exception):
                driver.execute_script("window.stop();")
            time.sleep(1.2)
            if attempt == max_attempts:
                log("⚠ マップのトップが表示されずスキップ")
                return False
    return False

# ===== 店名・レビュー =====
def get_place_name(driver):
    name_selectors = ['h1.DUwDvf.lfPIob','h1.fontHeadlineLarge','h1[aria-level="1"]','h1[role="heading"]','[data-attrid="title"] span']
    for css in name_selectors:
        try:
            el = WebDriverWait(driver, 6).until(EC.visibility_of_element_located((By.CSS_SELECTOR, css)))
            txt = (el.text or "").strip()
            if txt: return txt
        except Exception:
            pass
    try:
        og = driver.find_element(By.CSS_SELECTOR, 'meta[property="og:title"]')
        content = (og.get_attribute("content") or "").strip()
        if content: return content
    except Exception: pass
    try:
        title = (driver.title or "").strip()
        return title.split(" - ")[0].strip() if " - " in title else title
    except Exception:
        return ""

def get_reviews_count(driver):
    try:
        for el in driver.find_elements(By.CSS_SELECTOR, '[aria-label]'):
            label = el.get_attribute("aria-label") or ""
            m = REVIEWS_RE.search(label)
            if m: return m.group(1).replace(",", "")
    except Exception: pass
    try:
        main = wait_css(driver, 'div[role="main"]', timeout=10)
        m = REVIEWS_RE.search(safe_text(main))
        if m: return m.group(1).replace(",", "")
    except Exception: pass
    return ""

# ===== カテゴリ =====
def get_category(driver):
    try:
        el = find_first(driver, [
            (By.CSS_SELECTOR, 'button[jsaction*="category"]'),
            (By.XPATH, '//button[contains(@jsaction,"category")]'),
            (By.CSS_SELECTOR, 'button.DkEaL'),
            (By.CSS_SELECTOR, 'a[jsaction*="category"]'),
        ])
        if el:
            txt = (el.text or "").strip()
            return txt
    except Exception:
        pass
    return ""

# ===== HP / SNS =====
def get_website_and_socials(driver):
    website = ""; socials = []
    try:
        a = find_first(driver, [
            (By.CSS_SELECTOR, 'a[data-item-id="authority"]'),
            (By.CSS_SELECTOR, 'a[aria-label^="ウェブサイト:"]'),
            (By.XPATH, '//a[starts-with(@aria-label, "ウェブサイト:")]')
        ])
        if a:
            href = clean_href(a.get_attribute("href") or "")
            if href: website = href
    except Exception: pass
    try: anchors = wait_css(driver, 'div[role="main"]', 10).find_elements(By.CSS_SELECTOR, 'a[href]')
    except Exception: anchors = driver.find_elements(By.CSS_SELECTOR, 'a[href]')
    seen = set()
    for a in anchors:
        try:
            href = clean_href(a.get_attribute("href") or "")
            if not href or href in seen: continue
            seen.add(href)
            low = href.lower()
            if low.startswith(("tel:", "javascript:", "mailto:")): continue
            if "/maps/dir" in low or "/maps/reserve" in low or ("/maps/place/" in low and "google." in low): continue
            if is_social_url(href): socials.append(href); continue
            if not website and not is_block_website(href): website = href
        except Exception:
            continue
    return website, " ".join(dict.fromkeys(socials))

# ===== 緯度・経度 =====
def parse_coords_from_url(url):
    for pat in COORD_URL_PATTERNS:
        m = re.search(pat, url or "")
        if not m: continue
        a, b = float(m.group(1)), float(m.group(2))
        return (b, a) if ("2d" in pat and "3d" in pat) else (a, b)
    return None

def parse_coords_from_ogimage(driver):
    try:
        og = driver.find_element(By.CSS_SELECTOR, 'meta[property="og:image"]')
        url = og.get_attribute("content") or ""
        qs = urlparse(url).query
        center = parse_qs(qs).get("center", [""])[0]
        if center and "," in center:
            lat, lon = center.split(",", 1)
            return float(lat), float(lon)
    except Exception: pass
    return None

# ===== 抽出本体 =====
def extract_details_from_current_page(driver):
    name = get_place_name(driver)
    category = get_category(driver)

    phone = ""
    try:
        for a in driver.find_elements(By.CSS_SELECTOR, 'a[href^="tel:"]'):
            href = a.get_attribute("href") or ""
            if href.startswith("tel:"):
                phone = normalize_hyphen(href.replace("tel:", "").strip()); break
    except Exception: pass
    if not phone:
        try:
            btn = find_first(driver, [
                (By.CSS_SELECTOR, 'button[aria-label^="電話番号:"]'),
                (By.XPATH, '//button[starts-with(@aria-label, "電話番号:")]'),
            ])
            if btn:
                m = TEL_RE.search(btn.get_attribute("aria-label") or "")
                if m: phone = normalize_hyphen(m.group(0))
        except Exception: pass
    if not phone:
        try:
            m = TEL_RE.search(safe_text(wait_css(driver, 'div[role="main"]')))
            if m: phone = normalize_hyphen(m.group(0))
        except Exception: pass

    address = ""; postal = ""
    try:
        addr_btn = find_first(driver, [
            (By.CSS_SELECTOR, 'button[aria-label^="住所:"]'),
            (By.XPATH, '//button[starts-with(@aria-label, "住所:")]'),
            (By.CSS_SELECTOR, '[data-item-id="address"]'),
        ])
        if addr_btn:
            address = (addr_btn.get_attribute("aria-label") or "").replace("住所:", "").strip()
    except Exception: pass
    if not address:
        try:
            main = wait_css(driver, 'div[role="main"]', 10)
            lines = [l.strip() for l in safe_text(main).split("\n") if l.strip()]
            addr_line = ""
            for l in lines:
                if "〒" in l: addr_line = l; break
            if not addr_line:
                cand = [l for l in lines if any(x in l for x in ["県","府","道","都"]) and any(y in l for y in ["市","区","町","村"])]
                if cand: addr_line = max(cand, key=len)
            address = addr_line or ""
        except Exception: pass
    address = normalize_hyphen(address)
    m = POSTAL_RE.search(address)
    if m:
        postal = m.group(1)
        address = address.replace("〒" + postal, "").replace(postal, "").strip()

    website, socials = get_website_and_socials(driver)
    reviews = get_reviews_count(driver)

    lat, lon = None, None
    try:
        latlon = parse_coords_from_url(driver.current_url) or parse_coords_from_ogimage(driver)
        if latlon: lat, lon = latlon
    except Exception: pass

    return {
        "company_name": name,
        "category": category,
        "phone": phone,
        "postal_code": postal,
        "address": address,
        "website_url": website,
        "sns_urls": socials,
        "review_count": int(reviews) if reviews else 0,
        "latitude": round(lat, 6) if lat is not None else None,
        "longitude": round(lon, 6) if lon is not None else None,
        "google_maps_url": driver.current_url,
    }

# ===== タブを開いて抽出 =====
def open_and_extract(driver, place_url):
    TIMEOUT = CARD_LOAD_TIMEOUT

    def _seen_heading(drv):
        try:
            return WebDriverWait(drv, 0.1).until(EC.any_of(
                EC.visibility_of_element_located((By.CSS_SELECTOR, 'h1.DUwDvf.lfPIob')),
                EC.visibility_of_element_located((By.CSS_SELECTOR, 'h1.fontHeadlineLarge')),
                EC.visibility_of_element_located((By.CSS_SELECTOR, 'h1[aria-level="1"]')),
                EC.visibility_of_element_located((By.CSS_SELECTOR, 'h1[role="heading"]')),
            ))
        except Exception:
            return None

    def _looks_blank(drv):
        try:
            return drv.execute_script("""
                const b=document.body;
                const text=(b && b.innerText)||"";
                const hasH1=!!document.querySelector('h1,[aria-level="1"],[role="heading"]');
                const ifr=document.getElementsByTagName('iframe').length;
                return (!hasH1 && ifr===0 && text.trim().length<5);
            """)
        except Exception:
            return False

    def _force_close_current_tab():
        with suppress(Exception):
            driver.close()
        with suppress(Exception):
            driver.execute_script("window.close();")

    base = None
    with suppress(Exception):
        base = driver.current_window_handle

    opened_new_tab = True
    try:
        driver.execute_script("window.open(arguments[0], '_blank');", place_url)
        time.sleep(0.6)
        driver.switch_to.window(driver.window_handles[-1])
    except Exception:
        opened_new_tab = False
        with suppress(Exception):
            driver.get("about:blank")
        with suppress(Exception):
            driver.get(place_url)

    row = None
    start = time.monotonic()
    try:
        while True:
            if _seen_heading(driver):
                with suppress(Exception):
                    row = extract_details_from_current_page(driver)
                break

            if _looks_blank(driver):
                with suppress(Exception):
                    driver.execute_script("void 0")

            if (time.monotonic() - start) >= TIMEOUT:
                log(f"⏭ タイムアウト→スキップ: {place_url}")
                break

            try:
                WebDriverWait(driver, 6).until(lambda d: _seen_heading(d))
            except Exception:
                pass
    except Exception as e:
        log(f"⏭ 例外スキップ: {place_url} / {e}")
        row = None
    finally:
        if opened_new_tab:
            _force_close_current_tab()
            with suppress(Exception):
                handles = driver.window_handles
                if base and (base in handles):
                    driver.switch_to.window(base)
                elif handles:
                    driver.switch_to.window(handles[0])
        else:
            with suppress(Exception):
                driver.get("about:blank")
            with suppress(Exception):
                if base:
                    driver.switch_to.window(base)

    return row

# ===== 一覧：スクロール・URL収集・クリック補完 =====
def collect_place_urls_from_feed(driver, feed, expect_min=0):
    urls = set()
    try:
        for a in feed.find_elements(By.CSS_SELECTOR, 'a.hfpxzc'):
            href = a.get_attribute("href") or ""
            if "/maps/place/" in href: urls.add(href)
    except Exception: pass
    try:
        for a in feed.find_elements(By.CSS_SELECTOR, 'a[href*="/maps/place/"]'):
            href = a.get_attribute("href") or ""
            if href: urls.add(href)
    except Exception: pass

    cards_total = len(driver.find_elements(By.CSS_SELECTOR, 'div.Nv2PK'))
    for idx in range(cards_total):
        if expect_min and len(urls) >= expect_min: break
        try:
            card = driver.find_elements(By.CSS_SELECTOR, 'div.Nv2PK')[idx]
        except Exception:
            break
        with suppress(Exception):
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", card)
            time.sleep(0.2)

        try:
            a = card.find_element(By.CSS_SELECTOR, 'a.hfpxzc')
            href = a.get_attribute("href") or ""
            if "/maps/place/" in href: urls.add(href); continue
        except Exception:
            try:
                a = card.find_element(By.CSS_SELECTOR, 'a[href*="/maps/place/"]')
                href = a.get_attribute("href") or ""
                if "/maps/place/" in href: urls.add(href); continue
            except Exception:
                pass

        try:
            card.click()
            WebDriverWait(driver, 12).until(EC.any_of(
                EC.visibility_of_element_located((By.CSS_SELECTOR, 'h1.DUwDvf.lfPIob')),
                EC.visibility_of_element_located((By.CSS_SELECTOR, 'h1.fontHeadlineLarge')),
                EC.visibility_of_element_located((By.CSS_SELECTOR, 'h1[aria-level="1"]')),
                EC.visibility_of_element_located((By.CSS_SELECTOR, 'h1[role="heading"]')),
            ))
            cur = driver.current_url
            if "/maps/place/" in cur: urls.add(cur)
        except Exception:
            pass
        finally:
            with suppress(Exception):
                driver.back()
            try:
                WebDriverWait(driver, 12).until(EC.presence_of_element_located((By.XPATH, '//div[@role="feed"]')))
                feed = driver.find_element(By.XPATH, '//div[@role="feed"]')
            except Exception:
                break
    return list(urls)

def scroll_feed_to_bottom(driver, feed):
    prev_count = 0
    stagnate = 0
    for _ in range(80):
        driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", feed)
        time.sleep(1.4)
        cards = driver.find_elements(By.CSS_SELECTOR, 'div.Nv2PK')
        if len(cards) == prev_count:
            stagnate += 1
        else:
            stagnate = 0
            prev_count = len(cards)
        if stagnate >= 5: break
    return prev_count

def click_next_page_if_exists(driver):
    candidates = [
        (By.CSS_SELECTOR, 'button[aria-label^="次へ"]'),
        (By.CSS_SELECTOR, 'button[aria-label*="次"]'),
        (By.CSS_SELECTOR, 'button[aria-label^="Next"]'),
        (By.XPATH, '//button[.//span[contains(text(),"次へ")]]'),
        (By.XPATH, '//button[contains(text(),"次へ")]'),
        (By.XPATH, '//button[contains(text(),"Next")]'),
        (By.XPATH, '//a[contains(text(),"次へ") or contains(text(),"Next")]'),
        (By.XPATH, '//button[contains(text(),"さらに表示") or contains(text(),"他の結果") or contains(text(),"More results")]'),
    ]
    for by, sel in candidates:
        try:
            btn = driver.find_element(by, sel)
            if not btn.is_enabled(): continue
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
            time.sleep(0.2)
            btn.click()
            WebDriverWait(driver, 12).until(EC.presence_of_element_located((By.XPATH, '//div[@role="feed"]')))
            time.sleep(0.8)
            return True
        except Exception:
            continue
    return False


def main():
    parser = argparse.ArgumentParser(description="Googleマップスクレイパー")
    parser.add_argument("--keyword", required=True, help="検索キーワード（例: リノベーション業者）")
    parser.add_argument("--cities", required=True, help="エリアリスト（JSON配列）")
    parser.add_argument("--max-pages", type=int, default=5, help="最大ページ数")
    parser.add_argument("--headless", action="store_true", help="ヘッドレスモードで実行")
    args = parser.parse_args()

    cities = json.loads(args.cities)
    keyword_suffix = f"　{args.keyword}"

    log(f"🚀 スクレイピング開始: キーワード={args.keyword}, エリア数={len(cities)}")

    # Chrome起動
    options = Options()
    if args.headless:
        options.add_argument("--headless=new")
    options.add_argument("--start-maximized")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--lang=ja")

    try:
        driver = webdriver.Chrome(options=options)
    except Exception as e:
        print(json.dumps({"error": f"Chrome起動失敗: {str(e)}"}), file=sys.stdout)
        sys.exit(1)

    all_results = []

    try:
        for city_idx, city in enumerate(cities, 1):
            query = city + keyword_suffix
            log(f"\n🔎 [{city_idx}/{len(cities)}] 検索: {query}")

            search_url = f"https://www.google.co.jp/maps/search/?api=1&query={quote_plus(query)}&hl=ja"
            driver.get(search_url)
            with suppress(Exception):
                handle_google_consent(driver, timeout=8)
            time.sleep(3)

            all_urls = set()
            page = 1
            while page <= args.max_pages:
                try:
                    feed = WebDriverWait(driver, 8).until(
                        EC.presence_of_element_located((By.XPATH, '//div[@role="feed"]'))
                    )
                except TimeoutException:
                    break

                cards = scroll_feed_to_bottom(driver, feed)
                log(f"📦 ページ{page} カード数: {cards}")

                urls = collect_place_urls_from_feed(driver, feed, expect_min=cards)
                all_urls.update(urls)
                log(f"🔗 ページ{page}: URL {len(urls)}件 / 累計 {len(all_urls)}件")

                if click_next_page_if_exists(driver):
                    page += 1
                    continue
                else:
                    break

            # 各プレイス抽出
            saved = 0
            for idx, u in enumerate(list(all_urls), 1):
                try:
                    row = open_and_extract(driver, u)
                    if row and row.get("company_name"):
                        row["area"] = city
                        row["industry"] = args.keyword
                        all_results.append(row)
                        saved += 1
                        if saved % 5 == 0:
                            log(f"  … {saved} 件取得中")
                except Exception as e:
                    log(f"  ✖ {idx}件目でエラー: {e}")
                    continue
            log(f"✅ {city}: {saved} 件取得完了")

    finally:
        with suppress(Exception):
            driver.quit()

    # JSON出力
    log(f"\n🔚 完了: 合計 {len(all_results)} 件")
    print(json.dumps(all_results, ensure_ascii=False))


if __name__ == "__main__":
    main()
