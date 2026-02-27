'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// エリアデータ（都道府県 → 市区町村）
const AREA_DATA: Record<string, string[]> = {
    '岐阜県': [
        '揖斐郡', '恵那市', '大垣市', '海津市', '各務原市', '可児市', '加茂郡', '岐阜市',
        '郡上市', '下呂市', '関市', '高山市', '多治見市', '土岐市', '中津川市', '羽島市',
        '瑞浪市', '瑞穂市', '美濃加茂市', '美濃市', '本巣市'
    ],
    '静岡県': [
        '静岡市葵区', '静岡市清水区', '静岡市駿河区', '浜松市中央区', '浜松市天竜区', '浜松市浜名区'
    ],
    '愛知県': [
        '愛西市', 'あま市', '安城市', '一宮市', '稲沢市', '犬山市', '岩倉市', '大府市', '岡崎市',
        '尾張旭市', '春日井市', '刈谷市', '蒲郡市', '北名古屋市', '清須市', '江南市', '小牧市',
        '新城市', '瀬戸市', '高浜市', '田原市', '知多市', '知立市', '津島市', '東海市', '常滑市',
        '豊明市', '豊川市', '豊田市', '豊橋市', '長久手市',
        '名古屋市熱田区', '名古屋市北区', '名古屋市昭和区', '名古屋市千種区', '名古屋市天白区',
        '名古屋市中川区', '名古屋市中区', '名古屋市中村区', '名古屋市西区', '名古屋市東区',
        '名古屋市瑞穂区', '名古屋市緑区', '名古屋市港区', '名古屋市南区', '名古屋市名東区', '名古屋市守山区',
        '西尾市', '日進市', '半田市', '碧南市', 'みよし市', '弥富市'
    ],
    '三重県': [
        '伊賀市', '伊勢市', '員弁郡東員町', 'いなべ市', '亀山市', '熊野市', '桑名市',
        '志摩市', '鈴鹿市', '多気郡', '津市', '鳥羽市', '名張市', '松阪市', '三重郡', '四日市市'
    ],
    '滋賀県': [
        '犬上郡', '近江八幡市', '大津市', '蒲生郡', '草津市', '甲賀市', '湖南市',
        '高島市', '長浜市', '東近江市', '彦根市', '米原市', '守山市', '野洲市', '栗東市'
    ],
    '京都府': [
        '綾部市', '宇治市', '乙訓郡大山崎町', '亀岡市', '木津川市', '京田辺市', '京丹後市',
        '京都市右京区', '京都市上京区', '京都市北区', '京都市左京区', '京都市下京区',
        '京都市中京区', '京都市西京区', '京都市東山区', '京都市伏見区', '京都市南区', '京都市山科区',
        '久世郡久御山町', '城陽市', '相楽郡', '綴喜郡', '長岡京市', '南丹市', '福知山市',
        '船井郡京丹波町', '舞鶴市', '宮津市', '向日市', '八幡市'
    ],
    '大阪府': [
        '池田市', '泉大津市', '泉佐野市', '和泉市', '茨木市', '大阪狭山市',
        '大阪市旭区', '大阪市阿倍野区', '大阪市生野区', '大阪市北区', '大阪市此花区',
        '大阪市城東区', '大阪市住之江区', '大阪市住吉区', '大阪市大正区', '大阪市中央区',
        '大阪市鶴見区', '大阪市天王寺区', '大阪市浪速区', '大阪市西区', '大阪市西成区',
        '大阪市西淀川区', '大阪市東住吉区', '大阪市東成区', '大阪市東淀川区', '大阪市平野区',
        '大阪市福島区', '大阪市港区', '大阪市都島区', '大阪市淀川区',
        '貝塚市', '柏原市', '交野市', '門真市', '河内長野市', '岸和田市',
        '堺市北区', '堺市堺区', '堺市中区', '堺市西区', '堺市東区', '堺市南区', '堺市美原区',
        '四條畷市', '吹田市', '摂津市', '泉南郡', '泉南市', '高石市', '高槻市', '大東市',
        '豊中市', '豊能郡', '富田林市', '寝屋川市', '羽曳野市', '阪南市', '東大阪市',
        '枚方市', '藤井寺市', '松原市', '三島郡島本町', '南河内郡', '箕面市', '守口市', '八尾市'
    ],
    '兵庫県': [
        '相生市', '明石市', '赤穂郡上郡町', '赤穂市', '朝来市', '芦屋市', '尼崎市', '淡路市',
        '伊丹市', '揖保郡太子町', '小野市', '加古川市', '加古郡稲美町', '加古郡播磨町',
        '加西市', '加東市', '川西市', '川辺郡猪名川町', '神崎郡',
        '神戸市北区', '神戸市須磨区', '神戸市垂水区', '神戸市中央区', '神戸市長田区',
        '神戸市灘区', '神戸市西区', '神戸市東灘区', '神戸市兵庫区',
        '佐用郡', '三田市', '宍粟市', '洲本市', '多可郡', '高砂市', '宝塚市', 'たつの市',
        '丹波篠山市', '丹波市', '豊岡市', '西宮市', '西脇市', '姫路市', '三木市', '南あわじ市', '養父市'
    ],
    '奈良県': [
        '生駒郡', '生駒市', '宇陀郡', '宇陀市', '橿原市', '香芝市', '葛城市', '北葛城郡',
        '五條市', '御所市', '桜井市', '磯城郡', '高市', '天理市', '奈良市',
        '大和郡山市', '大和高田市', '山辺郡山添村', '吉野郡'
    ],
    '和歌山県': [
        '有田郡有', '有田市', '伊都郡', '岩出市', '海南市', '紀の川市', '御坊市',
        '新宮市', '田辺市', '橋本市', '和歌山市'
    ],
    '鳥取県': ['岩美郡岩美町', '倉吉市', '西伯郡', '境港市', '東伯郡', '鳥取市', '米子市'],
    '岡山県': [
        '赤磐市', '浅口市', '井原市', '岡山市北区', '岡山市中区', '岡山市東区', '岡山市南区',
        '笠岡市', '倉敷市', '瀬戸内市', '総社市', '高梁市', '玉野市', '津山市', '新見市', '備前市', '真庭市', '美作市'
    ],
    '広島県': [
        '安芸郡', '安芸高田市', '江田島市', '大竹市', '尾道市', '呉市', '庄原市', '竹原市', '廿日市市', '東広島市',
        '広島市安芸区', '広島市安佐北区', '広島市安佐南区', '広島市佐伯区', '広島市中区',
        '広島市西区', '広島市東区', '広島市南区', '福山市', '府中市', '三原市', '三次市'
    ],
    '徳島県': ['阿南市', '阿波市', '板野郡', '小松島市', '徳島市', '鳴門市', '美馬市', '三好市', '吉野川市'],
    '香川県': ['高松市', '丸亀市', '三豊市'],
};

const ALL_PREFECTURES = Object.keys(AREA_DATA);

export default function ScrapePage() {
    const [keyword, setKeyword] = useState('リノベーション業者');
    const [selectedPrefectures, setSelectedPrefectures] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [headless, setHeadless] = useState(true);
    const [maxPages, setMaxPages] = useState(5);
    const [running, setRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState('');
    const [customCities, setCustomCities] = useState('');
    const logRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 都道府県トグル
    const togglePrefecture = (pref: string) => {
        if (selectedPrefectures.includes(pref)) {
            setSelectedPrefectures(prev => prev.filter(p => p !== pref));
            // 対応する市区町村を削除
            const citiesToRemove = new Set(AREA_DATA[pref]);
            setSelectedCities(prev => prev.filter(c => !citiesToRemove.has(c)));
        } else {
            setSelectedPrefectures(prev => [...prev, pref]);
            // 全市区町村を追加
            setSelectedCities(prev => [...new Set([...prev, ...AREA_DATA[pref]])]);
        }
    };

    // 市区町村トグル
    const toggleCity = (city: string) => {
        setSelectedCities(prev =>
            prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
        );
    };

    // 都道府県内の全選択/全解除
    const toggleAllCitiesInPref = (pref: string) => {
        const prefCities = AREA_DATA[pref];
        const allSelected = prefCities.every(c => selectedCities.includes(c));
        if (allSelected) {
            setSelectedCities(prev => prev.filter(c => !prefCities.includes(c)));
        } else {
            setSelectedCities(prev => [...new Set([...prev, ...prefCities])]);
        }
    };

    // ステータスポーリング
    const pollStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/scrape/status');
            const data = await res.json();
            setLogs(data.logs || []);
            setProgress(data.progress || '');
            if (!data.running) {
                setRunning(false);
                if (pollRef.current) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        // 初回チェック
        pollStatus();
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [pollStatus]);

    // ログ自動スクロール
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);

    // スクレイピング開始
    const startScrape = async () => {
        // カスタム都市を追加
        let cities = [...selectedCities];
        if (customCities.trim()) {
            const extra = customCities.split(/[,、\n]/).map(s => s.trim()).filter(Boolean);
            cities = [...new Set([...cities, ...extra])];
        }

        if (!keyword.trim() || cities.length === 0) {
            alert('キーワードとエリアを入力してください');
            return;
        }

        setRunning(true);
        setLogs([]);
        setProgress('開始中...');

        try {
            const res = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: keyword.trim(), cities, headless, maxPages }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'エラーが発生しました');
                setRunning(false);
                return;
            }
            // ポーリング開始
            pollRef.current = setInterval(pollStatus, 2000);
        } catch (e) {
            alert('APIエラー: ' + e);
            setRunning(false);
        }
    };

    return (
        <div>
            <div className="toolbar">
                <span style={{ fontWeight: 600, fontSize: 13 }}>🗺️ Googleマップ収集</span>
                <div className="toolbar-divider" />
                <span className="toolbar-label">Googleマップからリード候補を自動収集</span>
            </div>

            <div className="page-area">
                {/* 設定カード */}
                <div className="card">
                    <div className="card-header">
                        <h3>⚙️ スクレイピング設定</h3>
                    </div>
                    <div className="card-body">
                        {/* キーワード */}
                        <div className="scrape-field">
                            <label className="scrape-label">検索キーワード</label>
                            <input
                                type="text"
                                className="scrape-input"
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                placeholder="例: リノベーション業者"
                                disabled={running}
                            />
                            <span className="scrape-hint">Googleマップで「{selectedCities[0] || 'エリア'}　{keyword}」のように検索されます</span>
                        </div>

                        {/* オプション */}
                        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                            <div className="scrape-field" style={{ flex: '0 0 160px' }}>
                                <label className="scrape-label">最大ページ数</label>
                                <input
                                    type="number"
                                    className="scrape-input"
                                    value={maxPages}
                                    onChange={e => setMaxPages(Number(e.target.value))}
                                    min={1} max={20}
                                    disabled={running}
                                    style={{ width: 80 }}
                                />
                            </div>
                            <div className="scrape-field" style={{ flex: '0 0 200px' }}>
                                <label className="scrape-label">実行モード</label>
                                <label className="scrape-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={headless}
                                        onChange={e => setHeadless(e.target.checked)}
                                        disabled={running}
                                    />
                                    ヘッドレス（バックグラウンド実行）
                                </label>
                            </div>
                        </div>

                        {/* エリア選択 */}
                        <div className="scrape-field">
                            <label className="scrape-label">
                                対象エリア
                                <span className="scrape-badge">{selectedCities.length}件選択中</span>
                            </label>

                            {/* 都道府県ボタン */}
                            <div className="scrape-pref-grid">
                                {ALL_PREFECTURES.map(pref => (
                                    <button
                                        key={pref}
                                        className={`scrape-pref-btn ${selectedPrefectures.includes(pref) ? 'active' : ''}`}
                                        onClick={() => togglePrefecture(pref)}
                                        disabled={running}
                                    >
                                        {pref}
                                        <span className="scrape-pref-count">{AREA_DATA[pref].length}</span>
                                    </button>
                                ))}
                            </div>

                            {/* 選択中の都道府県の市区町村 */}
                            {selectedPrefectures.map(pref => (
                                <div key={pref} className="scrape-cities-group">
                                    <div className="scrape-cities-header">
                                        <strong>{pref}</strong>
                                        <button
                                            className="btn btn-sm"
                                            onClick={() => toggleAllCitiesInPref(pref)}
                                            disabled={running}
                                            style={{ fontSize: 11, padding: '2px 8px' }}
                                        >
                                            {AREA_DATA[pref].every(c => selectedCities.includes(c)) ? '全解除' : '全選択'}
                                        </button>
                                    </div>
                                    <div className="scrape-city-grid">
                                        {AREA_DATA[pref].map(city => (
                                            <label key={city} className={`scrape-city-chip ${selectedCities.includes(city) ? 'active' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCities.includes(city)}
                                                    onChange={() => toggleCity(city)}
                                                    disabled={running}
                                                    style={{ display: 'none' }}
                                                />
                                                {city}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* カスタム入力 */}
                            <div style={{ marginTop: 12 }}>
                                <label className="scrape-label" style={{ fontSize: 11 }}>追加エリア（カンマ区切り）</label>
                                <input
                                    type="text"
                                    className="scrape-input"
                                    value={customCities}
                                    onChange={e => setCustomCities(e.target.value)}
                                    placeholder="例: 東京都渋谷区, 横浜市"
                                    disabled={running}
                                />
                            </div>
                        </div>

                        {/* 実行ボタン */}
                        <button
                            className={`btn btn-primary scrape-start-btn ${running ? 'disabled' : ''}`}
                            onClick={startScrape}
                            disabled={running}
                        >
                            {running ? '⏳ スクレイピング実行中...' : '🚀 スクレイピング開始'}
                        </button>
                    </div>
                </div>

                {/* 進捗・ログ */}
                {(running || logs.length > 0) && (
                    <div className="card">
                        <div className="card-header">
                            <h3>{running ? '⏳ 実行中' : '✅ 完了'}</h3>
                            <span className="scrape-progress-text">{progress}</span>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {running && (
                                <div className="scrape-progress-bar">
                                    <div className="scrape-progress-bar-fill" />
                                </div>
                            )}
                            <div className="scrape-log" ref={logRef}>
                                {logs.map((log, i) => (
                                    <div key={i} className={`scrape-log-line ${log.startsWith('✅') ? 'success' : log.startsWith('❌') || log.startsWith('✖') ? 'error' : ''}`}>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ヘルプ */}
                <div className="card">
                    <div className="card-header">
                        <h3>📖 使い方</h3>
                    </div>
                    <div className="card-body">
                        <div className="scrape-help-grid">
                            <div className="scrape-help-item">
                                <div className="scrape-help-step">1</div>
                                <div>
                                    <strong>キーワード入力</strong>
                                    <p>検索したい業種を入力（例: リノベーション業者、工務店、美容室）</p>
                                </div>
                            </div>
                            <div className="scrape-help-item">
                                <div className="scrape-help-step">2</div>
                                <div>
                                    <strong>エリア選択</strong>
                                    <p>都道府県を選択 → 市区町村を個別にON/OFF</p>
                                </div>
                            </div>
                            <div className="scrape-help-item">
                                <div className="scrape-help-step">3</div>
                                <div>
                                    <strong>実行</strong>
                                    <p>「スクレイピング開始」でGoogleマップを自動巡回。結果は自動でリード登録されます</p>
                                </div>
                            </div>
                            <div className="scrape-help-item">
                                <div className="scrape-help-step">4</div>
                                <div>
                                    <strong>リード確認</strong>
                                    <p>完了後、「リード管理」で収集データを確認・分析開始</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 前提条件 */}
                <div className="card" style={{ borderColor: 'var(--accent-warning)' }}>
                    <div className="card-header">
                        <h3>⚠️ 前提条件</h3>
                    </div>
                    <div className="card-body" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2.0 }}>
                            <li><code>python3</code> がインストールされていること</li>
                            <li><code>pip3 install selenium</code> で Selenium をインストール済みであること</li>
                            <li>Google Chrome がインストールされていること</li>
                            <li>ChromeDriver がPATHに通っているか、Seleniumが自動管理できること</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
