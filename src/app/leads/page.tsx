'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface Lead {
    id: number; company_name: string; industry: string; area: string;
    phone: string; email: string; website_url: string; score: number;
    status: string; notes: string; open_count: number; view_count: number;
    report_progress: string; created_at: string;
}

interface Analysis {
    has_ssl: number; page_title: string; meta_description: string;
    has_proper_h1: number; has_sitemap: number; has_robots_txt: number;
    has_structured_data: number; internal_link_count: number;
    title_length: number; description_length: number;
    structured_data_types: string; has_faq_schema: number;
    has_video_schema: number; has_canonical: number; has_hreflang: number;
    has_noindex: number; has_breadcrumb: number;
    is_responsive: number; has_viewport_meta: number; page_size_kb: number;
    script_count: number; has_image_optimization: number;
    images_without_alt: number; has_favicon: number; has_apple_touch_icon: number;
    has_dark_mode: number; has_skeleton_screen: number; has_auto_carousel: number;
    has_autoplay_video: number; has_popup_overlay: number; font_size_ok: number;
    has_ogp: number; has_sns_links: number; has_analytics: number;
    has_form_cta: number; has_tel_link: number; has_video_content: number;
    has_line_link: number; has_reviews_ugc: number; has_cookie_consent: number;
    has_security_headers: number; has_hsts: number; has_x_content_type: number;
    has_mixed_content: number; has_sri: number;
    last_updated_text: string; cms_type: string;
    has_lang_attr: number; heading_structure_ok: number;
    has_aria: number; has_skip_link: number;
    praises: string | string[]; issues: string | string[];
    recommendations: string | string[]; score: number;
    category_scores: string | { seo: number; ux: number; marketing: number; security: number; accessibility: number };
    analyzed_at: string;
    instagram_url?: string;
    facebook_url?: string;
    extracted_emails?: string;
}

interface Proposal { id: number; token: string; title: string; created_at: string; }
interface Email { id: number; subject: string; status: string; sent_at: string; created_at: string; }
interface TrackingEvent { event_type: string; created_at: string; duration_seconds?: number; }

function parseIssues(issues: string | string[] | undefined | null): string[] {
    if (!issues) return [];
    if (Array.isArray(issues)) return issues;
    try { return JSON.parse(issues); } catch { return []; }
}

const STATUS_LABELS: Record<string, string> = {
    new: '新規', proposal_sent: '提案送信済', opened: '開封済',
    clicked: 'レポート閲覧', called: '架電済', appointed: 'アポ獲得', rejected: '見送り',
};

const ITEMS_PER_PAGE = 50;

type SortKey = 'company_name' | 'industry' | 'area' | 'score' | 'status' | 'created_at';
type SortDir = 'asc' | 'desc';

function getScoreClass(s: number) {
    if (s >= 80) return 'score-red';
    if (s >= 70) return 'score-yellow';
    if (s >= 50) return 'score-blue';
    return 'score-gray';
}

function getDateRange(preset: string): [string, string] {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    if (preset === 'today') return [fmt(now), fmt(now)];
    if (preset === 'week') {
        const d = new Date(now); d.setDate(d.getDate() - d.getDay());
        return [fmt(d), fmt(now)];
    }
    if (preset === 'month') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        return [fmt(d), fmt(now)];
    }
    return ['', ''];
}

export default function LeadsPage() {
    // Data
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState<{ industries: string[]; areas: string[] }>({ industries: [], areas: [] });

    // Detail panel
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [emails, setEmails] = useState<Email[]>([]);
    const [events, setEvents] = useState<TrackingEvent[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState('info');
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Lead>>({});

    // Email compose
    const [emailCompose, setEmailCompose] = useState<{ subject: string; bodyHtml: string; proposalUrl: string } | null>(null);
    const [emailGenerating, setEmailGenerating] = useState(false);
    const [emailSending, setEmailSending] = useState(false);
    const [emailPreview, setEmailPreview] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterIndustries, setFilterIndustries] = useState<string[]>([]);
    const [filterAreas, setFilterAreas] = useState<string[]>([]);
    const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
    const [scoreMin, setScoreMin] = useState(0);
    const [scoreMax, setScoreMax] = useState(100);
    const [datePreset, setDatePreset] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Table
    const [sortKey, setSortKey] = useState<SortKey>('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

    // Bulk
    const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
    const [form, setForm] = useState({ company_name: '', industry: '', area: '', phone: '', email: '', website_url: '', notes: '' });

    const dropdownRef = useRef<HTMLDivElement>(null);
    const selected = leads.find(l => l.id === selectedId) || null;
    const isGenerating = selected ? !!(selected.report_progress && !['完了', 'エラー', ''].includes(selected.report_progress)) : false;

    const showToast = (message: string, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Load leads
    const loadLeads = useCallback(async () => {
        const res = await fetch('/api/leads');
        const data = await res.json();
        setLeads(data.data || data);
        if (data.meta) setMeta(data.meta);
        setLoading(false);
    }, []);

    useEffect(() => { loadLeads(); }, [loadLeads]);

    // Poll for progress
    useEffect(() => {
        const hasActive = leads.some(l => l.report_progress && !['完了', 'エラー', ''].includes(l.report_progress));
        if (!hasActive) return;
        const interval = setInterval(() => { loadLeads(); }, 3000);
        return () => clearInterval(interval);
    }, [leads, loadLeads]);

    // Load detail
    const loadDetail = useCallback(async (id: number) => {
        const res = await fetch(`/api/leads/${id}`);
        const data = await res.json();
        setAnalysis(data.analysis || null);
        setProposals(data.proposals || []);
        setEmails(data.emails || []);
        setEvents(data.events || []);
    }, []);

    useEffect(() => {
        if (selectedId) { loadDetail(selectedId); setActiveTab('info'); setEditMode(false); }
    }, [selectedId, loadDetail]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close slide panel on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // Handlers
    const handleAdd = async () => {
        if (!form.company_name) return;
        await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setForm({ company_name: '', industry: '', area: '', phone: '', email: '', website_url: '', notes: '' });
        setShowAddModal(false);
        await loadLeads();
        showToast('リードを追加しました');
    };

    const handleSave = async () => {
        if (!selected) return;
        await fetch(`/api/leads/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
        setEditMode(false);
        await loadLeads();
        showToast('保存しました');
    };

    const handleDelete = async () => {
        if (!selected) return;
        setConfirmModal({
            message: `「${selected.company_name}」を削除しますか？`,
            onConfirm: async () => {
                await fetch(`/api/leads/${selected.id}`, { method: 'DELETE' });
                setSelectedId(null); setAnalysis(null);
                await loadLeads();
                showToast('削除しました');
                setConfirmModal(null);
            }
        });
    };

    const handleAnalyze = async () => {
        if (!selected?.website_url) return alert('URLが設定されていません');
        setAnalyzing(true);
        try {
            const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: selected.id, url: selected.website_url }) });
            const data = await res.json();
            setAnalysis(data); loadLeads();
        } catch { alert('分析に失敗しました'); }
        finally { setAnalyzing(false); }
    };

    const handleCreateProposal = async () => {
        if (!selected || !analysis) return;
        setLeads(prev => prev.map(l => l.id === selected.id ? { ...l, report_progress: 'LP生成中 (1/3)' } : l));
        try {
            const res = await fetch(`/api/leads/${selected.id}/generate-report`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok || data.error) {
                alert(`エラー: ${data.error || `HTTP ${res.status}`}`);
            } else {
                const url = `https://proposal-viewer-zeta.vercel.app${data.proposal_url}`;
                navigator.clipboard.writeText(url);
                alert(`✅ 診断レポートを生成しました！\n\nURL: ${url}\n\nクリップボードにコピーしました。`);
                loadDetail(selected.id);
            }
        } catch (e) { alert(`診断レポート生成に失敗しました: ${e instanceof Error ? e.message : e}`); }
        finally { await loadLeads(); }
    };

    const handleStatusChange = async (id: number, status: string) => {
        await fetch(`/api/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        loadLeads();
    };

    const handleBulkStatus = (status: string) => {
        const ids = Array.from(checkedIds);
        setConfirmModal({
            message: `${ids.length}件のリードのステータスを「${STATUS_LABELS[status]}」に変更しますか？`,
            onConfirm: async () => {
                await fetch('/api/leads/bulk-update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_ids: ids, action: 'status', value: status }) });
                setCheckedIds(new Set());
                await loadLeads();
                showToast(`${ids.length}件のステータスを変更しました`);
                setConfirmModal(null);
            }
        });
    };

    const handleBulkDelete = () => {
        const ids = Array.from(checkedIds);
        setConfirmModal({
            message: `${ids.length}件のリードを削除しますか？この操作は取り消せません。`,
            onConfirm: async () => {
                await fetch('/api/leads/bulk-update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_ids: ids, action: 'delete' }) });
                setCheckedIds(new Set());
                setSelectedId(null);
                await loadLeads();
                showToast(`${ids.length}件を削除しました`);
                setConfirmModal(null);
            }
        });
    };

    // Sort handler
    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir(key === 'score' ? 'desc' : 'asc'); }
    };

    // Toggle multi-select filter
    const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
        setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
    };

    // Active filter tags
    const hasFilters = searchQuery || filterIndustries.length > 0 || filterAreas.length > 0 ||
        filterStatuses.length > 0 || scoreMin > 0 || scoreMax < 100 || datePreset || dateFrom || dateTo;

    const resetFilters = () => {
        setSearchQuery(''); setFilterIndustries([]); setFilterAreas([]); setFilterStatuses([]);
        setScoreMin(0); setScoreMax(100); setDatePreset(''); setDateFrom(''); setDateTo('');
    };

    // Filtering
    const filteredLeads = leads.filter(l => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (![l.company_name, l.phone, l.email, l.website_url].some(f => (f || '').toLowerCase().includes(q))) return false;
        }
        if (filterIndustries.length > 0 && !filterIndustries.includes(l.industry)) return false;
        if (filterAreas.length > 0 && !filterAreas.includes(l.area)) return false;
        if (filterStatuses.length > 0 && !filterStatuses.includes(l.status)) return false;
        if (l.score < scoreMin || l.score > scoreMax) return false;
        if (dateFrom || dateTo || datePreset) {
            const ld = l.created_at?.split('T')[0] || '';
            const [from, to] = datePreset ? getDateRange(datePreset) : [dateFrom, dateTo];
            if (from && ld < from) return false;
            if (to && ld > to) return false;
        }
        return true;
    }).sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'score') return ((a.score || 0) - (b.score || 0)) * dir;
        if (sortKey === 'created_at') return a.created_at.localeCompare(b.created_at) * dir;
        const av = (a[sortKey] || '').toString();
        const bv = (b[sortKey] || '').toString();
        return av.localeCompare(bv, 'ja') * dir;
    });

    const visibleLeads = filteredLeads.slice(0, visibleCount);
    const hasMore = visibleCount < filteredLeads.length;

    useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [searchQuery, filterIndustries, filterAreas, filterStatuses, scoreMin, scoreMax, datePreset, dateFrom, dateTo]);

    // Check helpers
    const allChecked = filteredLeads.length > 0 && filteredLeads.every(l => checkedIds.has(l.id));
    const toggleAll = () => {
        if (allChecked) setCheckedIds(new Set());
        else setCheckedIds(new Set(filteredLeads.map(l => l.id)));
    };
    const toggleCheck = (id: number) => {
        const s = new Set(checkedIds);
        if (s.has(id)) s.delete(id); else s.add(id);
        setCheckedIds(s);
    };

    const SortIcon = ({ col }: { col: SortKey }) => (
        <span className={`sort-icon ${sortKey === col ? 'active' : ''}`}>
            {sortKey === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
    );

    // Dropdown component
    const FilterDropdown = ({ id, label, options, selected: sel, onToggle }: {
        id: string; label: string; options: string[]; selected: string[];
        onToggle: (val: string) => void;
    }) => (
        <div className="filter-dropdown">
            <button className="filter-dropdown-btn" onClick={() => setOpenDropdown(openDropdown === id ? null : id)}>
                {label} {sel.length > 0 && <span className="count">{sel.length}</span>} ▾
            </button>
            {openDropdown === id && (
                <div className="filter-dropdown-menu">
                    {options.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)' }}>データなし</div>
                    ) : options.map(opt => (
                        <label key={opt}>
                            <input type="checkbox" checked={sel.includes(opt)} onChange={() => onToggle(opt)} />
                            {opt}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );

    if (loading) return <div className="loading">読み込み中...</div>;

    const scoreColor = (s: number) => s >= 70 ? 'score-high' : s >= 40 ? 'score-mid' : 'score-low';

    // Render helpers for detail tabs
    const renderInfoTab = () => {
        if (!selected) return null;
        if (editMode) return (
            <>
                <div className="fm-field-grid">
                    {[['企業名', 'company_name'], ['業種', 'industry'], ['エリア', 'area'], ['電話番号', 'phone'], ['メール', 'email']].map(([lbl, key]) => (
                        <div className="fm-field" key={key}>
                            <span className="fm-field-label">{lbl}</span>
                            <input className="fm-field-input" value={(editForm as Record<string, string>)[key] || ''} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} />
                        </div>
                    ))}
                    <div className="fm-field fm-field-full">
                        <span className="fm-field-label">URL</span>
                        <input className="fm-field-input" value={editForm.website_url || ''} onChange={e => setEditForm({ ...editForm, website_url: e.target.value })} />
                    </div>
                </div>
                <div style={{ marginTop: 8 }}>
                    <div className="fm-field fm-field-full">
                        <span className="fm-field-label">メモ</span>
                        <textarea className="fm-field-input" value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={() => setEditMode(false)}>キャンセル</button>
                    <button className="btn btn-primary" onClick={handleSave}>💾 保存</button>
                </div>
            </>
        );
        return (
            <>
                <div className="fm-field-grid">
                    <div className="fm-field"><span className="fm-field-label">企業名</span><div className="fm-field-value">{selected.company_name || '-'}</div></div>
                    <div className="fm-field"><span className="fm-field-label">業種</span><div className="fm-field-value">{selected.industry || '-'}</div></div>
                    <div className="fm-field"><span className="fm-field-label">エリア</span><div className="fm-field-value">{selected.area || '-'}</div></div>
                    <div className="fm-field"><span className="fm-field-label">電話番号</span><div className="fm-field-value">{selected.phone || '-'}</div></div>
                    <div className="fm-field"><span className="fm-field-label">メール</span><div className="fm-field-value">{selected.email ? <a href={`mailto:${selected.email}`}>{selected.email}</a> : '-'}</div></div>
                    <div className="fm-field fm-field-full"><span className="fm-field-label">URL</span><div className="fm-field-value">{selected.website_url ? <a href={selected.website_url} target="_blank" rel="noopener">{selected.website_url}</a> : '-'}</div></div>
                </div>
                {analysis && (analysis.instagram_url || analysis.facebook_url || analysis.extracted_emails) && (() => {
                    let extractedEmails: string[] = [];
                    if (analysis.extracted_emails) {
                        try { extractedEmails = JSON.parse(analysis.extracted_emails); } catch { extractedEmails = []; }
                    }
                    return (analysis.instagram_url || analysis.facebook_url || extractedEmails.length > 0) ? (
                        <div className="fm-portal" style={{ marginTop: 8 }}>
                            <div className="fm-portal-header"><span>📱 SNS・連絡先（自動抽出）</span></div>
                            <div className="fm-portal-body" style={{ padding: '8px 12px' }}>
                                {analysis.instagram_url && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                                        <span>📸</span>
                                        <span style={{ fontWeight: 600, minWidth: 70 }}>Instagram</span>
                                        <a href={analysis.instagram_url} target="_blank" rel="noopener" style={{ color: '#E1306C' }}>{analysis.instagram_url.replace(/https?:\/\/(www\.)?/, '')}</a>
                                    </div>
                                )}
                                {analysis.facebook_url && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                                        <span>📘</span>
                                        <span style={{ fontWeight: 600, minWidth: 70 }}>Facebook</span>
                                        <a href={analysis.facebook_url} target="_blank" rel="noopener" style={{ color: '#1877F2' }}>{analysis.facebook_url.replace(/https?:\/\/(www\.)?/, '')}</a>
                                    </div>
                                )}
                                {extractedEmails.length > 0 && extractedEmails.map((em, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                                        <span>✉️</span>
                                        <span style={{ fontWeight: 600, minWidth: 70 }}>メール</span>
                                        <a href={`mailto:${em}`}>{em}</a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null;
                })()}
                {selected.notes && <div style={{ marginTop: 8 }}><div className="fm-field fm-field-full"><span className="fm-field-label">メモ</span><div className="fm-field-value" style={{ whiteSpace: 'pre-wrap' }}>{selected.notes}</div></div></div>}
                <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm" onClick={() => { setEditMode(true); setEditForm({ ...selected }); }}>✏️ 編集</button>
                    {selected.website_url && <button className="btn btn-sm btn-primary" onClick={handleAnalyze} disabled={analyzing}>{analyzing ? '⏳ 分析中...' : '🔍 サイト分析'}</button>}
                    {analysis && <button className="btn btn-sm btn-success" onClick={handleCreateProposal} disabled={isGenerating}>{isGenerating ? `⏳ ${selected?.report_progress}` : '📄 診断レポート生成'}</button>}
                    {proposals.length > 0 && selected.email && <button className="btn btn-sm" style={{ background: '#7c3aed', color: '#fff' }} onClick={() => { setActiveTab('emails'); handleGenerateEmail(); }}>✉️ メール送信</button>}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <div className="fm-action-stat" style={{ flex: 1 }}><div className="value">{selected.open_count || 0}</div><div className="label">メール開封</div></div>
                    <div className="fm-action-stat" style={{ flex: 1 }}><div className="value">{selected.view_count || 0}</div><div className="label">レポート閲覧</div></div>
                    <div className="fm-action-stat" style={{ flex: 1 }}><div className="value">{selected.score || 0}</div><div className="label">分析スコア</div></div>
                    <div className="fm-action-stat" style={{ flex: 1 }}><div className="value">{proposals.length}</div><div className="label">レポート数</div></div>
                </div>
            </>
        );
    };

    const renderAnalysisTab = () => {
        if (!selected) return null;
        if (!analysis) return (
            <div className="empty-state"><div className="empty-icon">🔍</div><p>まだ分析されていません</p>
                {selected?.website_url && <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>{analyzing ? '分析中...' : '🔍 サイト分析を実行'}</button>}
            </div>
        );
        const cs = typeof analysis.category_scores === 'string'
            ? (() => { try { return JSON.parse(analysis.category_scores); } catch { return { seo: 0, ux: 0, marketing: 0, security: 0, accessibility: 0 }; } })()
            : (analysis.category_scores || { seo: 0, ux: 0, marketing: 0, security: 0, accessibility: 0 });
        const catBar = (name: string, score: number, max: number, color: string) => (
            <div style={{ marginBottom: 8 }} key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, marginBottom: 3 }}><span>{name}</span><span style={{ color }}>{score} / {max}</span></div>
                <div style={{ height: 6, background: '#e8ecf0', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', width: `${(score / max) * 100}%`, background: color, borderRadius: 3 }} /></div>
            </div>
        );
        const chk = (val: number | boolean, label: string) => <div className={`check-item ${val ? 'pass' : 'fail'}`} key={label}>{val ? '✅' : '❌'} {label}</div>;
        return (
            <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div className="fm-action-stat"><div className="value" style={{ fontSize: 28 }}>{analysis.score}</div><div className="label">/ 100</div></div>
                    <div style={{ flex: 1 }}>
                        <div className="score-inline"><div className="score-bar" style={{ flex: 1, height: 8 }}><div className={`score-bar-fill ${scoreColor(analysis.score)}`} style={{ width: `${analysis.score}%` }} /></div></div>
                        {analysis.cms_type && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>CMS: <strong>{analysis.cms_type}</strong> | {analysis.page_size_kb}KB | スクリプト{analysis.script_count}個</div>}
                    </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                    {catBar('🔍 SEO基盤', cs.seo, 30, '#3b82f6')}{catBar('📱 UX/モバイル', cs.ux, 25, '#8b5cf6')}
                    {catBar('📣 集客・マーケ', cs.marketing, 25, '#f59e0b')}{catBar('🔒 セキュリティ', cs.security, 10, '#10b981')}
                    {catBar('♿ アクセシビリティ', cs.accessibility, 10, '#6366f1')}
                </div>
                <div className="fm-portal" style={{ marginBottom: 8 }}><div className="fm-portal-header"><span>🔍 SEO基盤（{cs.seo}/30）</span></div><div className="fm-portal-body"><div className="check-grid">
                    {chk(analysis.has_ssl, 'SSL (HTTPS)')}{chk(!!analysis.page_title, 'ページタイトル')}{chk(!!analysis.meta_description, 'meta description')}
                    {chk(analysis.has_proper_h1, 'H1構造')}{chk(analysis.has_sitemap, 'sitemap.xml')}{chk(analysis.has_robots_txt, 'robots.txt')}
                    {chk(analysis.has_structured_data, '構造化データ')}{chk(analysis.has_canonical, 'canonical URL')}{chk(analysis.has_breadcrumb, 'パンくず')}
                    {chk(!analysis.has_noindex, 'noindex未設定')}{chk(analysis.has_faq_schema, 'FAQスキーマ')}{chk(analysis.internal_link_count >= 3, `内部リンク (${analysis.internal_link_count}件)`)}
                </div></div></div>
                <div className="fm-portal" style={{ marginBottom: 8 }}><div className="fm-portal-header"><span>📱 UX/モバイル（{cs.ux}/25）</span></div><div className="fm-portal-body"><div className="check-grid">
                    {chk(analysis.is_responsive, 'レスポンシブ')}{chk(analysis.page_size_kb <= 500, `サイズ (${analysis.page_size_kb}KB)`)}
                    {chk(analysis.has_image_optimization, '画像最適化')}{chk(analysis.has_favicon, 'ファビコン')}
                    {chk(analysis.has_apple_touch_icon, 'Apple Touch')}{chk(!analysis.has_auto_carousel, '自動カルーセル無し')}
                    {chk(!analysis.has_autoplay_video, '自動再生無し')}{chk(analysis.font_size_ok, 'フォント16px以上')}
                </div></div></div>
                <div className="fm-portal" style={{ marginBottom: 8 }}><div className="fm-portal-header"><span>📣 集客・マーケ（{cs.marketing}/25）</span></div><div className="fm-portal-body"><div className="check-grid">
                    {chk(analysis.has_ogp, 'OGP')}{chk(analysis.has_sns_links, 'SNS連携')}{chk(analysis.has_analytics, 'アクセス解析')}
                    {chk(analysis.has_form_cta, 'フォーム/CTA')}{chk(analysis.has_tel_link, '電話クリッカブル')}{chk(analysis.has_video_content, '動画')}
                    {chk(analysis.has_line_link, 'LINE連携')}{chk(analysis.has_reviews_ugc, '口コミ')}
                </div></div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div className="fm-portal"><div className="fm-portal-header"><span>🔒 セキュリティ（{cs.security}/10）</span></div><div className="fm-portal-body"><div className="check-grid" style={{ gridTemplateColumns: '1fr' }}>
                        {chk(analysis.has_security_headers, 'セキュリティヘッダー')}{chk(analysis.has_hsts, 'HSTS')}
                        {chk(!analysis.has_mixed_content, '混在コンテンツ無し')}{chk(!parseIssues(analysis.issues).some(i => i.includes('未更新') || i.includes('停止')), '定期更新')}
                    </div></div></div>
                    <div className="fm-portal"><div className="fm-portal-header"><span>♿ アクセシビリティ（{cs.accessibility}/10）</span></div><div className="fm-portal-body"><div className="check-grid" style={{ gridTemplateColumns: '1fr' }}>
                        {chk(analysis.has_lang_attr, 'lang属性')}{chk(analysis.heading_structure_ok, '見出し構造')}
                        {chk(analysis.images_without_alt === 0, `alt属性 (不足${analysis.images_without_alt}枚)`)}{chk(analysis.has_aria, 'WAI-ARIA')}{chk(analysis.has_skip_link, 'スキップリンク')}
                    </div></div></div>
                </div>
                {analysis.page_title && <div className="fm-field" style={{ marginTop: 6 }}><span className="fm-field-label">タイトル ({analysis.page_title.length}文字)</span><div className="fm-field-value">{analysis.page_title}</div></div>}
                {analysis.meta_description && <div className="fm-field" style={{ marginTop: 4 }}><span className="fm-field-label">description ({analysis.meta_description.length}文字)</span><div className="fm-field-value" style={{ fontSize: 11 }}>{analysis.meta_description}</div></div>}
                {parseIssues(analysis.praises).length > 0 && <div className="fm-portal" style={{ marginTop: 8 }}><div className="fm-portal-header" style={{ background: '#e8f5e9' }}><span>👏 良い点</span><span style={{ color: '#2e7d32', fontWeight: 700 }}>{parseIssues(analysis.praises).length} 件</span></div><div className="fm-portal-body" style={{ background: '#f1f8e9' }}><ul style={{ padding: '0 12px', listStyle: 'none', margin: 0 }}>{parseIssues(analysis.praises).map((p, i) => <li key={i} style={{ padding: '4px 0', fontSize: 12, color: '#2e7d32', borderBottom: '1px solid #c8e6c9' }}>{p}</li>)}</ul></div></div>}
                {parseIssues(analysis.issues).length > 0 && <div className="fm-portal" style={{ marginTop: 8 }}><div className="fm-portal-header"><span>💡 改善ポイント</span><span style={{ color: '#e74c3c', fontWeight: 700 }}>{parseIssues(analysis.issues).length} 件</span></div><div className="fm-portal-body"><ul className="issue-list" style={{ padding: '0 12px' }}>{parseIssues(analysis.issues).map((issue, i) => <li key={i}>{issue}</li>)}</ul></div></div>}
                {parseIssues(analysis.recommendations).length > 0 && <div className="fm-portal" style={{ marginTop: 8 }}><div className="fm-portal-header" style={{ background: '#e3f2fd' }}><span>🚀 推奨アクション</span><span style={{ color: '#1565c0', fontWeight: 700 }}>{parseIssues(analysis.recommendations).length} 件</span></div><div className="fm-portal-body" style={{ background: '#e8eaf6' }}><ul style={{ padding: '0 12px', listStyle: 'none', margin: 0 }}>{parseIssues(analysis.recommendations).map((r, i) => <li key={i} style={{ padding: '4px 0', fontSize: 12, color: '#283593', borderBottom: '1px solid #c5cae9' }}>{r}</li>)}</ul></div></div>}
                <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm" onClick={handleAnalyze} disabled={analyzing}>{analyzing ? '⏳ 再分析中...' : '🔍 再分析'}</button>
                    <button className="btn btn-sm btn-success" onClick={handleCreateProposal} disabled={isGenerating}>{isGenerating ? `⏳ ${selected?.report_progress}` : '📄 診断レポート生成'}</button>
                </div>
            </>
        );
    };

    const renderProposalsTab = () => {
        if (!selected) return null;
        if (proposals.length === 0) return (
            <div className="empty-state"><div className="empty-icon">📄</div><p>診断レポートがまだありません</p>
                {analysis && <button className="btn btn-primary" onClick={handleCreateProposal} disabled={isGenerating}>{isGenerating ? `⏳ ${selected?.report_progress}` : '📄 診断レポート生成'}</button>}
            </div>
        );
        return (
            <div className="fm-portal"><div className="fm-portal-header"><span>📄 診断レポート一覧</span><span>{proposals.length} 件</span></div><div className="fm-portal-body">
                {proposals.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}>
                        <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{p.title}</div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleString('ja-JP')}</div></div>
                        <a href={`https://proposal-viewer-zeta.vercel.app/proposals/${p.token}`} target="_blank" className="btn btn-sm btn-primary" rel="noopener">🔗 表示</a>
                        <button className="btn btn-sm" onClick={() => { navigator.clipboard.writeText(`https://proposal-viewer-zeta.vercel.app/proposals/${p.token}`); showToast('URLをコピーしました'); }}>📋 URL</button>
                    </div>
                ))}
            </div></div>
        );
    };

    const handleGenerateEmail = async () => {
        if (!selected) return;
        setEmailGenerating(true);
        setEmailCompose(null);
        try {
            const res = await fetch(`/api/leads/${selected.id}/generate-email`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setEmailCompose({ subject: data.subject, bodyHtml: data.body_html, proposalUrl: data.proposal_url });
            setEmailPreview(true);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'セールスレター生成に失敗しました', 'error');
        } finally {
            setEmailGenerating(false);
        }
    };

    const handleSendEmailDirect = async () => {
        if (!selected || !emailCompose) return;
        if (!selected.email) { showToast('メールアドレスが登録されていません', 'error'); return; }
        if (!confirm(`${selected.company_name} (${selected.email}) にメールを送信します。よろしいですか？`)) return;
        setEmailSending(true);
        try {
            // Create draft
            const draftRes = await fetch('/api/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', lead_id: selected.id, proposal_id: proposals[0]?.id, subject: emailCompose.subject, body_html: emailCompose.bodyHtml }),
            });
            const draftData = await draftRes.json();
            if (!draftRes.ok) throw new Error(draftData.error || 'メール作成に失敗');
            // Send
            const sendRes = await fetch('/api/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send', email_id: draftData.id || draftData.email_id }),
            });
            const sendData = await sendRes.json();
            if (!sendRes.ok) throw new Error(sendData.error || '送信に失敗');
            showToast(`✅ ${selected.company_name} にメール送信しました`);
            setEmailCompose(null);
            setEmailPreview(false);
            loadDetail(selected.id);
            loadLeads();
        } catch (err) {
            showToast(err instanceof Error ? err.message : '送信に失敗しました', 'error');
        } finally {
            setEmailSending(false);
        }
    };

    const renderEmailsTab = () => {
        if (!selected) return null;
        return (
            <>
                {/* セールスレター生成エリア */}
                <div className="fm-portal" style={{ marginBottom: 12 }}>
                    <div className="fm-portal-header"><span>✨ セールスレター</span></div>
                    <div className="fm-portal-body" style={{ padding: 12 }}>
                        {!emailCompose && !emailGenerating && (
                            <div style={{ textAlign: 'center' }}>
                                {proposals.length > 0 ? (
                                    <>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>AIが診断結果を基にパーソナライズされたセールスレターを自動生成します</p>
                                        <button className="btn btn-primary" onClick={handleGenerateEmail} disabled={!selected.email}>
                                            {selected.email ? '🤖 セールスレターを自動生成' : '⚠️ メールアドレス未登録'}
                                        </button>
                                    </>
                                ) : (
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>先に診断レポートを生成してください</p>
                                )}
                            </div>
                        )}
                        {emailGenerating && (
                            <div style={{ textAlign: 'center', padding: 20 }}>
                                <div style={{ width: 32, height: 32, border: '3px solid #e0e0e0', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>AIがセールスレターを生成中...</p>
                            </div>
                        )}
                        {emailCompose && emailPreview && (
                            <div>
                                <div style={{ marginBottom: 8 }}>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>件名</label>
                                    <input type="text" value={emailCompose.subject} onChange={e => setEmailCompose({ ...emailCompose, subject: e.target.value })} style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-light)', borderRadius: 4, fontSize: 13, marginTop: 2 }} />
                                </div>
                                <div style={{ marginBottom: 8 }}>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>本文プレビュー</label>
                                    <div style={{ border: '1px solid var(--border-light)', borderRadius: 4, padding: 12, maxHeight: 300, overflow: 'auto', background: '#fff', marginTop: 2 }}>
                                        <div dangerouslySetInnerHTML={{ __html: emailCompose.bodyHtml }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                    <button className="btn btn-sm" onClick={() => { setEmailCompose(null); setEmailPreview(false); }}>キャンセル</button>
                                    <button className="btn btn-sm" onClick={handleGenerateEmail} disabled={emailGenerating}>🔄 再生成</button>
                                    <button className="btn btn-sm" style={{ background: '#7c3aed', color: '#fff' }} onClick={handleSendEmailDirect} disabled={emailSending}>
                                        {emailSending ? '⏳ 送信中...' : '📨 この内容で送信'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* メール送信履歴 */}
                {emails.length > 0 && (
                    <div className="fm-portal"><div className="fm-portal-header"><span>✉️ メール履歴</span><span>{emails.length} 件</span></div><div className="fm-portal-body">
                        {emails.map(em => (
                            <div key={em.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}>
                                <span className={`badge badge-${em.status}`}>{em.status === 'draft' ? '下書き' : em.status === 'approved' ? '承認済' : '送信済'}</span>
                                <div style={{ flex: 1 }}>{em.subject}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(em.created_at).toLocaleDateString('ja-JP')}</div>
                            </div>
                        ))}
                    </div></div>
                )}
            </>
        );
    };

    const renderHistoryTab = () => {
        if (!selected) return null;
        return (
            <>
                <div className="fm-field-grid" style={{ marginBottom: 12 }}>
                    <div className="fm-field"><span className="fm-field-label">登録日</span><div className="fm-field-value">{new Date(selected.created_at).toLocaleString('ja-JP')}</div></div>
                    <div className="fm-field"><span className="fm-field-label">ステータス</span><div className="fm-field-value"><span className={`badge badge-${selected.status}`}>{STATUS_LABELS[selected.status]}</span></div></div>
                </div>
                {events.filter(ev => ev.event_type !== 'duration_update').length > 0 ? (
                    <div className="fm-portal"><div className="fm-portal-header"><span>📊 アクティビティ</span><span>{events.filter(ev => ev.event_type !== 'duration_update').length} 件</span></div><div className="fm-portal-body">
                        {events.filter(ev => ev.event_type !== 'duration_update').map((ev, i) => {
                            const fmtDuration = (s: number) => { if (s < 60) return `${s}秒`; return `${Math.floor(s / 60)}分${s % 60}秒`; };
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 11 }}>
                                    <span>{ev.event_type === 'email_open' ? '📩' : ev.event_type === 'proposal_view' ? '👀' : '🔗'}</span>
                                    <div style={{ flex: 1 }}>
                                        {ev.event_type === 'email_open' ? 'メール開封' : ev.event_type === 'proposal_view' ? 'レポート閲覧' : 'リンククリック'}
                                        {ev.event_type === 'proposal_view' && ev.duration_seconds && ev.duration_seconds > 0 && (
                                            <span style={{ marginLeft: 6, color: '#7c3aed', fontWeight: 600 }}>⏱ {fmtDuration(ev.duration_seconds)}</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(ev.created_at).toLocaleString('ja-JP')}</div>
                                </div>
                            );
                        })}
                    </div></div>
                ) : <div className="empty-state"><div className="empty-icon">📊</div><p>アクティビティ履歴がまだありません</p></div>}
            </>
        );
    };

    return (
        <div>
            {/* TOOLBAR */}
            <div className="toolbar">
                <button className="toolbar-btn primary" onClick={() => setShowAddModal(true)}>＋ 新規リード</button>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                    {filteredLeads.length !== leads.length ? `${filteredLeads.length} / ${leads.length} 件` : `${leads.length} 件`}
                </span>
            </div>

            {/* FILTER BAR */}
            <div className="filter-bar" ref={dropdownRef}>
                <input type="text" placeholder="🔍 企業名・電話・メール・URL..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <FilterDropdown id="industry" label="業種" options={meta.industries} selected={filterIndustries} onToggle={v => toggleFilter(filterIndustries, v, setFilterIndustries)} />
                <FilterDropdown id="area" label="エリア" options={meta.areas} selected={filterAreas} onToggle={v => toggleFilter(filterAreas, v, setFilterAreas)} />
                <FilterDropdown id="status" label="ステータス" options={Object.keys(STATUS_LABELS)} selected={filterStatuses}
                    onToggle={v => toggleFilter(filterStatuses, v, setFilterStatuses)} />
                <div className="filter-score-range">
                    <span>スコア {scoreMin}–{scoreMax}</span>
                    <input type="range" min={0} max={100} value={scoreMin} onChange={e => setScoreMin(Number(e.target.value))} />
                    <input type="range" min={0} max={100} value={scoreMax} onChange={e => setScoreMax(Number(e.target.value))} />
                </div>
                <div className="filter-date-presets">
                    {[['today', '今日'], ['week', '今週'], ['month', '今月']].map(([k, l]) => (
                        <button key={k} className={datePreset === k ? 'active' : ''} onClick={() => { setDatePreset(datePreset === k ? '' : k); setDateFrom(''); setDateTo(''); }}>{l}</button>
                    ))}
                </div>
                {hasFilters && <button className="filter-reset" onClick={resetFilters}>リセット</button>}
            </div>

            {/* FILTER TAGS */}
            {hasFilters && (
                <div className="filter-tags">
                    {searchQuery && <span className="filter-tag">検索: {searchQuery} <button onClick={() => setSearchQuery('')}>×</button></span>}
                    {filterIndustries.map(v => <span key={v} className="filter-tag">{v} <button onClick={() => setFilterIndustries(filterIndustries.filter(x => x !== v))}>×</button></span>)}
                    {filterAreas.map(v => <span key={v} className="filter-tag">{v} <button onClick={() => setFilterAreas(filterAreas.filter(x => x !== v))}>×</button></span>)}
                    {filterStatuses.map(v => <span key={v} className="filter-tag">{STATUS_LABELS[v]} <button onClick={() => setFilterStatuses(filterStatuses.filter(x => x !== v))}>×</button></span>)}
                    {(scoreMin > 0 || scoreMax < 100) && <span className="filter-tag">スコア {scoreMin}–{scoreMax} <button onClick={() => { setScoreMin(0); setScoreMax(100); }}>×</button></span>}
                    {datePreset && <span className="filter-tag">{datePreset === 'today' ? '今日' : datePreset === 'week' ? '今週' : '今月'} <button onClick={() => setDatePreset('')}>×</button></span>}
                </div>
            )}

            {/* TABLE */}
            <div className="page-area">
                <div className="leads-table-wrap">
                    <table className="leads-table">
                        <thead><tr>
                            <th><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                            <th onClick={() => handleSort('company_name')}>企業名 <SortIcon col="company_name" /></th>
                            <th onClick={() => handleSort('industry')}>業種 <SortIcon col="industry" /></th>
                            <th onClick={() => handleSort('area')}>エリア <SortIcon col="area" /></th>
                            <th onClick={() => handleSort('score')}>スコア <SortIcon col="score" /></th>
                            <th>温度</th>
                            <th onClick={() => handleSort('status')}>ステータス <SortIcon col="status" /></th>
                            <th onClick={() => handleSort('created_at')}>登録日 <SortIcon col="created_at" /></th>
                        </tr></thead>
                        <tbody>
                            {visibleLeads.map(lead => {
                                const heatLevel = (lead.open_count > 0 ? 1 : 0) + (lead.view_count > 0 ? 1 : 0) + (lead.status === 'appointed' ? 1 : lead.status === 'called' ? 1 : 0);
                                return (
                                    <tr key={lead.id}
                                        data-status={lead.status}
                                        className={`${selectedId === lead.id ? 'selected' : ''} ${checkedIds.has(lead.id) ? 'checked' : ''}`}
                                        onClick={() => { setSelectedId(lead.id); loadDetail(lead.id); }}>
                                        <td onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" checked={checkedIds.has(lead.id)} onChange={() => toggleCheck(lead.id)} />
                                        </td>
                                        <td className="company-cell">
                                            {lead.company_name}
                                            {lead.report_progress && !['完了', ''].includes(lead.report_progress) && (
                                                <span className={`progress-badge ${lead.report_progress === 'エラー' ? 'error' : ''}`}>
                                                    {lead.report_progress === 'エラー' ? '⚠️ エラー' : `⏳ ${lead.report_progress}`}
                                                </span>
                                            )}
                                        </td>
                                        <td>{lead.industry || '-'}</td>
                                        <td>{lead.area || '-'}</td>
                                        <td className={`score-cell ${getScoreClass(lead.score)}`}>
                                            {lead.score > 0 ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span>{lead.score}</span>
                                                    <div className="score-bar" style={{ width: 60, height: 5 }}>
                                                        <div className={`score-bar-fill ${getScoreClass(lead.score).replace('score-', 'fill-')}`} style={{ width: `${lead.score}%` }} />
                                                    </div>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td><div className="temp-icons" title={`メール開封${lead.open_count}回 / レポート閲覧${lead.view_count}回`}>
                                            {heatLevel === 0 && <span style={{ opacity: 0.3, fontSize: 12 }}>―</span>}
                                            {heatLevel >= 1 && <span>🔥</span>}
                                            {heatLevel >= 2 && <span>🔥</span>}
                                            {heatLevel >= 3 && <span>🔥</span>}
                                        </div></td>
                                        <td><span className={`badge badge-${lead.status}`}>{STATUS_LABELS[lead.status]}</span></td>
                                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lead.created_at ? new Date(lead.created_at).toLocaleDateString('ja-JP') : '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {hasMore && <div style={{ padding: '12px 0', textAlign: 'center', cursor: 'pointer', color: 'var(--accent)', fontSize: 13, fontWeight: 600, borderTop: '1px solid var(--border-light)' }} onClick={() => setVisibleCount(v => v + ITEMS_PER_PAGE)}>さらに{Math.min(ITEMS_PER_PAGE, filteredLeads.length - visibleCount)}件を表示</div>}
                    {filteredLeads.length === 0 && <div className="empty-state"><div className="empty-icon">🏢</div><p>{hasFilters ? '条件に一致するリードがありません' : 'リードがまだありません'}</p><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Googleマップ収集やCSVインポートでリードを追加しましょう</p></div>}
                </div>
            </div>

            {/* SLIDE PANEL */}
            {selectedId && selected && (
                <>
                    <div className="slide-panel-overlay" onClick={() => setSelectedId(null)} />
                    <div className="slide-panel">
                        <div className="slide-panel-header">
                            <div><h2>{selected.company_name}</h2><div className="sub">{[selected.industry, selected.area].filter(Boolean).join(' ・ ')}</div></div>
                            <button className="slide-panel-close" onClick={() => setSelectedId(null)}>✕</button>
                        </div>
                        <div className="slide-panel-actions">
                            <button className="btn btn-sm" onClick={() => { setEditMode(true); setEditForm({ ...selected }); setActiveTab('info'); }}>✏️ 編集</button>
                            {selected.website_url && <button className="btn btn-sm btn-primary" onClick={handleAnalyze} disabled={analyzing}>{analyzing ? '⏳ 分析中...' : '🔍 分析'}</button>}
                            {analysis && <button className="btn btn-sm btn-success" onClick={handleCreateProposal} disabled={isGenerating}>{isGenerating ? `⏳ ${selected.report_progress}` : '📄 レポート生成'}</button>}
                            <select className="btn btn-sm" value={selected.status} onChange={e => handleStatusChange(selected.id, e.target.value)} style={{ fontSize: 11 }}>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <div style={{ flex: 1 }} />
                            <button className="btn btn-sm btn-danger" onClick={handleDelete}>🗑</button>
                        </div>
                        <div className="fm-tabs">
                            {[['info', '📋 基本情報'], ['analysis', '🔍 分析結果'], ['proposals', '📄 レポート'], ['emails', '✉️ メール'], ['history', '📊 履歴']].map(([key, label]) => (
                                <div key={key} className={`fm-tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>{label}</div>
                            ))}
                        </div>
                        <div className="slide-panel-body">
                            <div className="fm-fields">
                                {activeTab === 'info' && renderInfoTab()}
                                {activeTab === 'analysis' && renderAnalysisTab()}
                                {activeTab === 'proposals' && renderProposalsTab()}
                                {activeTab === 'emails' && renderEmailsTab()}
                                {activeTab === 'history' && renderHistoryTab()}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* BULK BAR */}
            {checkedIds.size > 0 && (
                <div className="bulk-bar">
                    <span className="bulk-count">{checkedIds.size} 件選択中</span>
                    <div className="bulk-actions">
                        <select className="btn" defaultValue="" onChange={e => { if (e.target.value) handleBulkStatus(e.target.value); e.target.value = ''; }}>
                            <option value="" disabled>ステータス一括変更...</option>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <button className="btn btn-danger" onClick={handleBulkDelete}>🗑 一括削除</button>
                    </div>
                    <button className="bulk-close" onClick={() => setCheckedIds(new Set())}>✕</button>
                </div>
            )}

            {/* ADD MODAL */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>🏢 新規リード追加</h3><button className="modal-close" onClick={() => setShowAddModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label>企業名 *</label><input className="form-control" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="株式会社〇〇" /></div>
                            <div className="form-row">
                                <div className="form-group"><label>業種</label><input className="form-control" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="飲食店, 美容室..." /></div>
                                <div className="form-group"><label>エリア</label><input className="form-control" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="東京都渋谷区" /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>電話番号</label><input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="03-XXXX-XXXX" /></div>
                                <div className="form-group"><label>メール</label><input className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@example.com" /></div>
                            </div>
                            <div className="form-group"><label>WEBサイトURL</label><input className="form-control" value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} placeholder="https://example.com" /></div>
                            <div className="form-group"><label>メモ</label><textarea className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn" onClick={() => setShowAddModal(false)}>キャンセル</button><button className="btn btn-primary" onClick={handleAdd}>追加</button></div>
                    </div>
                </div>
            )}

            {/* CONFIRM MODAL */}
            {confirmModal && (
                <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header"><h3>⚠️ 確認</h3><button className="modal-close" onClick={() => setConfirmModal(null)}>×</button></div>
                        <div className="modal-body"><p style={{ fontSize: 13 }}>{confirmModal.message}</p></div>
                        <div className="modal-footer"><button className="btn" onClick={() => setConfirmModal(null)}>キャンセル</button><button className="btn btn-danger" onClick={confirmModal.onConfirm}>実行</button></div>
                    </div>
                </div>
            )}

            {/* TOAST */}
            {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        </div>
    );
}
