'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface Lead {
    id: number;
    company_name: string;
    industry: string;
    area: string;
    phone: string;
    email: string;
    website_url: string;
    score: number;
    status: string;
    notes: string;
    open_count: number;
    view_count: number;
    report_progress: string;
    created_at: string;
}

interface Analysis {
    // SEO
    has_ssl: number;
    page_title: string;
    meta_description: string;
    has_proper_h1: number;
    has_sitemap: number;
    has_robots_txt: number;
    has_structured_data: number;
    internal_link_count: number;
    title_length: number;
    description_length: number;
    structured_data_types: string;
    has_faq_schema: number;
    has_video_schema: number;
    has_canonical: number;
    has_hreflang: number;
    has_noindex: number;
    has_breadcrumb: number;
    // UX
    is_responsive: number;
    has_viewport_meta: number;
    page_size_kb: number;
    script_count: number;
    has_image_optimization: number;
    images_without_alt: number;
    has_favicon: number;
    has_apple_touch_icon: number;
    has_dark_mode: number;
    has_skeleton_screen: number;
    has_auto_carousel: number;
    has_autoplay_video: number;
    has_popup_overlay: number;
    font_size_ok: number;
    // Marketing
    has_ogp: number;
    has_sns_links: number;
    has_analytics: number;
    has_form_cta: number;
    has_tel_link: number;
    has_video_content: number;
    has_line_link: number;
    has_reviews_ugc: number;
    has_cookie_consent: number;
    // Security
    has_security_headers: number;
    has_hsts: number;
    has_x_content_type: number;
    has_mixed_content: number;
    has_sri: number;
    last_updated_text: string;
    cms_type: string;
    // Accessibility
    has_lang_attr: number;
    heading_structure_ok: number;
    has_aria: number;
    has_skip_link: number;
    // Aggregate
    praises: string | string[];
    issues: string | string[];
    recommendations: string | string[];
    score: number;
    category_scores: string | { seo: number; ux: number; marketing: number; security: number; accessibility: number };
    analyzed_at: string;
}

interface Proposal {
    id: number;
    token: string;
    title: string;
    created_at: string;
}

interface Email {
    id: number;
    subject: string;
    status: string;
    sent_at: string;
    created_at: string;
}

interface TrackingEvent {
    event_type: string;
    created_at: string;
}

function parseIssues(issues: string | string[] | undefined | null): string[] {
    if (!issues) return [];
    if (Array.isArray(issues)) return issues;
    try { return JSON.parse(issues); } catch { return []; }
}

const STATUS_LABELS: Record<string, string> = {
    new: '新規', proposal_sent: '提案送信済',
    opened: '開封済', clicked: 'レポート閲覧', called: '架電済',
    appointed: 'アポ獲得', rejected: '見送り',
};

const ITEMS_PER_PAGE = 50;

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [emails, setEmails] = useState<Email[]>([]);
    const [events, setEvents] = useState<TrackingEvent[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState('info');
    const [searchQuery, setSearchQuery] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Lead>>({});
    const [form, setForm] = useState({ company_name: '', industry: '', area: '', phone: '', email: '', website_url: '', notes: '' });
    // NEW: filter, sort, lazy load
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'score' | 'name'>('newest');
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const selectedRef = useRef<HTMLDivElement>(null);

    const selected = leads.find(l => l.id === selectedId) || null;
    // Per-lead generation state: derived from report_progress in DB (polled)
    const isGenerating = selected ? !!(selected.report_progress && !['完了', 'エラー', ''].includes(selected.report_progress)) : false;
    const currentIndex = selected ? leads.indexOf(selected) : -1;

    const loadLeads = useCallback(async () => {
        const res = await fetch('/api/leads');
        const data = await res.json();
        setLeads(data);
        setLoading(false);
    }, []);

    useEffect(() => { loadLeads(); }, [loadLeads]);

    // Poll for progress updates when any lead has active generation
    useEffect(() => {
        const hasActiveProgress = leads.some(l => l.report_progress && !['完了', 'エラー', ''].includes(l.report_progress));
        if (!hasActiveProgress) return;
        const interval = setInterval(() => { loadLeads(); }, 3000);
        return () => clearInterval(interval);
    }, [leads, loadLeads]);

    const loadDetail = useCallback(async (id: number) => {
        const res = await fetch(`/api/leads/${id}`);
        const data = await res.json();
        setAnalysis(data.analysis || null);
        setProposals(data.proposals || []);
        setEmails(data.emails || []);
        setEvents(data.events || []);
    }, []);

    useEffect(() => {
        if (selectedId) {
            loadDetail(selectedId);
            setActiveTab('info');
            setEditMode(false);
        }
    }, [selectedId, loadDetail]);

    // Auto-select first lead
    useEffect(() => {
        if (leads.length > 0 && !selectedId) setSelectedId(leads[0].id);
    }, [leads, selectedId]);

    const handleAdd = async () => {
        if (!form.company_name) return;
        const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const newLead = await res.json();
        setForm({ company_name: '', industry: '', area: '', phone: '', email: '', website_url: '', notes: '' });
        setShowAddModal(false);
        await loadLeads();
        setSelectedId(newLead.id);
    };

    const handleSave = async () => {
        if (!selected) return;
        await fetch(`/api/leads/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
        setEditMode(false);
        await loadLeads();
    };

    const handleDelete = async () => {
        if (!selected || !confirm('このリードを削除しますか？')) return;
        await fetch(`/api/leads/${selected.id}`, { method: 'DELETE' });
        setSelectedId(null);
        setAnalysis(null);
        loadLeads();
    };

    const handleAnalyze = async () => {
        if (!selected?.website_url) return alert('URLが設定されていません');
        setAnalyzing(true);
        try {
            const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: selected.id, url: selected.website_url }) });
            const data = await res.json();
            setAnalysis(data);
            loadLeads();
        } catch { alert('分析に失敗しました'); }
        finally { setAnalyzing(false); }
    };

    const handleCreateProposal = async () => {
        if (!selected || !analysis) return;
        // Optimistically set progress locally so UI updates immediately
        setLeads(prev => prev.map(l => l.id === selected.id ? { ...l, report_progress: 'LP生成中 (1/3)' } : l));
        try {
            const res = await fetch(`/api/leads/${selected.id}/generate-report`, {
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                alert(`エラー: ${data.error || `HTTP ${res.status}`}`);
            } else {
                // 顧客共有用URLは常にVercelの公開URLを使用
                const vercelBase = 'https://proposal-viewer-zeta.vercel.app';
                const proposalUrl = `${vercelBase}${data.proposal_url}`;
                navigator.clipboard.writeText(proposalUrl);
                alert(`✅ 診断レポートを生成しました！\n\nURL: ${proposalUrl}\n\nクリップボードにコピーしました。`);
                loadDetail(selected.id);
            }
        } catch (e) { alert(`診断レポート生成に失敗しました: ${e instanceof Error ? e.message : e}`); }
        finally { await loadLeads(); }
    };

    const handleStatusChange = async (status: string) => {
        if (!selected) return;
        await fetch(`/api/leads/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        loadLeads();
    };

    const navigateRecord = (dir: number) => {
        const newIdx = currentIndex + dir;
        if (newIdx >= 0 && newIdx < leads.length) setSelectedId(leads[newIdx].id);
    };

    const filteredLeads = leads
        .filter(l => {
            // Status filter
            if (statusFilter !== 'all' && l.status !== statusFilter) return false;
            // Text search
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return l.company_name.toLowerCase().includes(q) ||
                    (l.industry || '').toLowerCase().includes(q) ||
                    (l.area || '').toLowerCase().includes(q) ||
                    (l.phone || '').includes(q);
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'score') return (b.score || 0) - (a.score || 0);
            if (sortBy === 'name') return a.company_name.localeCompare(b.company_name, 'ja');
            return b.id - a.id; // newest
        });
    const visibleLeads = filteredLeads.slice(0, visibleCount);
    const hasMore = visibleCount < filteredLeads.length;

    // Reset visible count when filter changes
    useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [statusFilter, searchQuery, sortBy]);

    // Auto-scroll to selected item
    useEffect(() => {
        if (selectedRef.current) {
            selectedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedId]);

    const scoreColor = (s: number) => s >= 70 ? 'score-high' : s >= 40 ? 'score-mid' : 'score-low';

    if (loading) return <div className="loading">読み込み中...</div>;

    return (
        <div>
            {/* ===== TOOLBAR ===== */}
            <div className="toolbar">
                <div className="toolbar-section">
                    <span className="toolbar-label">レコード</span>
                    <div className="toolbar-record-nav">
                        <button onClick={() => navigateRecord(-1)} disabled={currentIndex <= 0}>‹</button>
                        <span>{currentIndex + 1} / {leads.length}</span>
                        <button onClick={() => navigateRecord(1)} disabled={currentIndex >= leads.length - 1}>›</button>
                    </div>
                </div>
                <div className="toolbar-divider" />
                <button className="toolbar-btn primary" onClick={() => setShowAddModal(true)}>＋ 新規レコード</button>
                {selected && (
                    <>
                        <button className="toolbar-btn" onClick={() => { setEditMode(true); setEditForm({ ...selected }); }}>✏️ 編集</button>
                        {analysis && (
                            <button className="toolbar-btn primary" onClick={handleCreateProposal} disabled={isGenerating}>
                                {isGenerating ? `⏳ ${selected.report_progress}` : '📄 診断レポート生成'}
                            </button>
                        )}

                        <button className="toolbar-btn danger" onClick={handleDelete}>🗑</button>
                    </>
                )}
                <div style={{ flex: 1 }} />
                <div className="toolbar-section">
                    <span className="toolbar-label">ステータス:</span>
                    {selected && (
                        <select
                            className="toolbar-btn"
                            value={selected.status}
                            onChange={e => handleStatusChange(e.target.value)}
                            style={{ background: 'var(--bg-toolbar-btn)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontSize: 11, padding: '3px 8px' }}
                        >
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* ===== MASTER-DETAIL LAYOUT ===== */}
            <div className="page-area">
                <div className="fm-layout">
                    {/* LEFT: Lead List */}
                    <div className="fm-list-panel">
                        <div className="fm-list-header">
                            <span>リード一覧</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {filteredLeads.length !== leads.length
                                    ? `${filteredLeads.length} / ${leads.length} 件`
                                    : `${leads.length} 件`
                                }
                            </span>
                        </div>
                        {/* Search + Filter Row */}
                        <div className="fm-list-search" style={{ display: 'flex', gap: 4 }}>
                            <input
                                type="text"
                                placeholder="🔍 検索..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', padding: '0 4px' }}
                                    title="検索クリア"
                                >✕</button>
                            )}
                        </div>
                        {/* Filter + Sort Controls */}
                        <div style={{ padding: '0 10px 8px', display: 'flex', gap: 4, alignItems: 'center' }}>
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                style={{ flex: 1, fontSize: 10, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border-light)', background: 'white', color: 'var(--text-body)' }}
                            >
                                <option value="all">全ステータス</option>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v} ({leads.filter(l => l.status === k).length})</option>
                                ))}
                            </select>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as 'newest' | 'score' | 'name')}
                                style={{ width: 80, fontSize: 10, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border-light)', background: 'white', color: 'var(--text-body)' }}
                            >
                                <option value="newest">新着順</option>
                                <option value="score">スコア順</option>
                                <option value="name">名前順</option>
                            </select>
                        </div>
                        <div className="fm-list-items">
                            {visibleLeads.map((lead) => (
                                <div
                                    key={lead.id}
                                    ref={selectedId === lead.id ? selectedRef : undefined}
                                    className={`fm-list-item ${selectedId === lead.id ? 'active' : ''}`}
                                    onClick={() => setSelectedId(lead.id)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div className="fm-list-item-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company_name}</div>
                                        {lead.score > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                                                <div style={{ width: 32, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${lead.score}%`, background: lead.score >= 70 ? '#22c55e' : lead.score >= 40 ? '#f59e0b' : '#ef4444', borderRadius: 2 }} />
                                                </div>
                                                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', minWidth: 20, textAlign: 'right' }}>{lead.score}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="fm-list-sub">
                                        <span className={`badge badge-${lead.status}`}>{STATUS_LABELS[lead.status]}</span>
                                        {lead.report_progress && !['完了', ''].includes(lead.report_progress) && (
                                            <span style={{
                                                fontSize: 9,
                                                padding: '1px 6px',
                                                borderRadius: 3,
                                                fontWeight: 700,
                                                ...(lead.report_progress === 'エラー'
                                                    ? { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
                                                    : { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', animation: 'pulse 2s infinite' }
                                                ),
                                            }}>
                                                {lead.report_progress === 'エラー' ? '⚠️ エラー' : `⏳ ${lead.report_progress}`}
                                            </span>
                                        )}
                                        {lead.industry && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{lead.industry}</span>}
                                        {lead.area && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{lead.area}</span>}
                                        {lead.open_count > 0 && <span style={{ fontSize: 9 }}>📩{lead.open_count}</span>}

                                    </div>
                                </div>
                            ))}
                            {hasMore && (
                                <div
                                    style={{ padding: '10px 0', textAlign: 'center', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 600, borderTop: '1px solid var(--border-light)' }}
                                    onClick={() => setVisibleCount(v => v + ITEMS_PER_PAGE)}
                                >
                                    さらに{Math.min(ITEMS_PER_PAGE, filteredLeads.length - visibleCount)}件を表示
                                </div>
                            )}
                            {filteredLeads.length === 0 && (
                                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                                    {statusFilter !== 'all' || searchQuery ? '条件に一致するリードがありません' : 'リードがありません'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Detail Panel */}
                    <div className="fm-detail-panel">
                        {selected ? (
                            <>
                                <div className="fm-detail-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div className="fm-detail-company">{selected.company_name}</div>
                                        <div className="fm-detail-company-sub">
                                            {selected.industry && <span>{selected.industry}</span>}
                                            {selected.industry && selected.area && <span> ・ </span>}
                                            {selected.area && <span>{selected.area}</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span className={`badge badge-${selected.status}`} style={{ fontSize: 12, padding: '4px 12px' }}>
                                            {STATUS_LABELS[selected.status]}
                                        </span>
                                        {selected.score > 0 && (
                                            <div className="fm-action-stat" style={{ minWidth: 64 }}>
                                                <div className="value">{selected.score}</div>
                                                <div className="label">スコア</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* TABS */}
                                <div className="fm-tabs">
                                    <div className={`fm-tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>📋 基本情報</div>
                                    <div className={`fm-tab ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>
                                        🔍 分析結果 {analysis && <span style={{ marginLeft: 4, fontSize: 10 }}>({analysis.score}点)</span>}
                                    </div>
                                    <div className={`fm-tab ${activeTab === 'proposals' ? 'active' : ''}`} onClick={() => setActiveTab('proposals')}>
                                        📄 診断レポート {proposals.length > 0 && <span style={{ marginLeft: 4, fontSize: 10 }}>({proposals.length})</span>}
                                    </div>
                                    <div className={`fm-tab ${activeTab === 'emails' ? 'active' : ''}`} onClick={() => setActiveTab('emails')}>
                                        ✉️ メール {emails.length > 0 && <span style={{ marginLeft: 4, fontSize: 10 }}>({emails.length})</span>}
                                    </div>
                                    <div className={`fm-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                                        📊 履歴
                                    </div>
                                </div>

                                <div className="fm-tab-content">
                                    {/* === INFO TAB === */}
                                    {activeTab === 'info' && (
                                        <div className="fm-fields">
                                            {editMode ? (
                                                <>
                                                    <div className="fm-field-grid">
                                                        <div className="fm-field">
                                                            <span className="fm-field-label">企業名</span>
                                                            <input className="fm-field-input" value={editForm.company_name || ''} onChange={e => setEditForm({ ...editForm, company_name: e.target.value })} />
                                                        </div>
                                                        <div className="fm-field">
                                                            <span className="fm-field-label">業種</span>
                                                            <input className="fm-field-input" value={editForm.industry || ''} onChange={e => setEditForm({ ...editForm, industry: e.target.value })} />
                                                        </div>
                                                        <div className="fm-field">
                                                            <span className="fm-field-label">エリア</span>
                                                            <input className="fm-field-input" value={editForm.area || ''} onChange={e => setEditForm({ ...editForm, area: e.target.value })} />
                                                        </div>
                                                        <div className="fm-field">
                                                            <span className="fm-field-label">電話番号</span>
                                                            <input className="fm-field-input" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                                                        </div>
                                                        <div className="fm-field">
                                                            <span className="fm-field-label">メール</span>
                                                            <input className="fm-field-input" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                                                        </div>
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
                                            ) : (
                                                <>
                                                    <div className="fm-field-grid">
                                                        <div className="fm-field">
                                                            <span className="fm-field-label">企業名</span>
                                                            <div className="fm-field-value">{selected.company_name || '-'}</div>
                                                        </div>
                                                        <div className="fm-field">
                                                            <span className="fm-field-label">業種</span>
                                                            <div className="fm-field-value">{selected.industry || '-'}</div>
                                                        </div>
                                                        <div className="fm-field">
                                                            <span className="fm-field-label">エリア</span>
                                                            <div className="fm-field-value">{selected.area || '-'}</div>
                                                        </div>
                                                        <div className="fm-field">
                                                            <span className="fm-field-label">電話番号</span>
                                                            <div className="fm-field-value">{selected.phone || '-'}</div>
                                                        </div>
                                                        <div className="fm-field">
                                                            <span className="fm-field-label">メール</span>
                                                            <div className="fm-field-value">
                                                                {selected.email ? <a href={`mailto:${selected.email}`}>{selected.email}</a> : '-'}
                                                            </div>
                                                        </div>
                                                        <div className="fm-field fm-field-full">
                                                            <span className="fm-field-label">URL</span>
                                                            <div className="fm-field-value">
                                                                {selected.website_url ? <a href={selected.website_url} target="_blank" rel="noopener">{selected.website_url}</a> : '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {selected.notes && (
                                                        <div style={{ marginTop: 8 }}>
                                                            <div className="fm-field fm-field-full">
                                                                <span className="fm-field-label">メモ</span>
                                                                <div className="fm-field-value" style={{ whiteSpace: 'pre-wrap' }}>{selected.notes}</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Quick action panel */}
                                                    <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
                                                        <button className="btn btn-sm" onClick={() => { setEditMode(true); setEditForm({ ...selected }); }}>✏️ 編集</button>
                                                        {selected.website_url && (
                                                            <button className="btn btn-sm btn-primary" onClick={handleAnalyze} disabled={analyzing}>
                                                                {analyzing ? '⏳ 分析中...' : '🔍 サイト分析'}
                                                            </button>
                                                        )}
                                                        {analysis && (
                                                            <button className="btn btn-sm btn-success" onClick={handleCreateProposal} disabled={isGenerating}>
                                                                {isGenerating ? `⏳ ${selected?.report_progress}` : '📄 診断レポート生成'}
                                                            </button>
                                                        )}

                                                    </div>



                                                    {/* Tracking Stats (FileMaker-style) */}
                                                    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                                        <div className="fm-action-stat" style={{ flex: 1 }}>
                                                            <div className="value">{selected.open_count || 0}</div>
                                                            <div className="label">メール開封</div>
                                                        </div>
                                                        <div className="fm-action-stat" style={{ flex: 1 }}>
                                                            <div className="value">{selected.view_count || 0}</div>
                                                            <div className="label">レポート閲覧</div>
                                                        </div>
                                                        <div className="fm-action-stat" style={{ flex: 1 }}>
                                                            <div className="value">{selected.score || 0}</div>
                                                            <div className="label">分析スコア</div>
                                                        </div>
                                                        <div className="fm-action-stat" style={{ flex: 1 }}>
                                                            <div className="value">{proposals.length}</div>
                                                            <div className="label">レポート数</div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* === ANALYSIS TAB === */}
                                    {activeTab === 'analysis' && (
                                        <div className="fm-fields">
                                            {analysis ? (() => {
                                                const cs = typeof analysis.category_scores === 'string'
                                                    ? (() => { try { return JSON.parse(analysis.category_scores); } catch { return { seo: 0, ux: 0, marketing: 0, security: 0, accessibility: 0 }; } })()
                                                    : (analysis.category_scores || { seo: 0, ux: 0, marketing: 0, security: 0, accessibility: 0 });
                                                const catLabel = (name: string, score: number, max: number, color: string) => (
                                                    <div style={{ marginBottom: 8 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>
                                                            <span>{name}</span>
                                                            <span style={{ color }}>{score} / {max}</span>
                                                        </div>
                                                        <div style={{ height: 6, background: '#e8ecf0', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${(score / max) * 100}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
                                                        </div>
                                                    </div>
                                                );
                                                const check = (val: number | boolean, label: string) => (
                                                    <div className={`check-item ${val ? 'pass' : 'fail'}`} key={label}>{val ? '✅' : '❌'} {label}</div>
                                                );
                                                return (
                                                    <>
                                                        {/* Score + CMS */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                                            <div className="fm-action-stat">
                                                                <div className="value" style={{ fontSize: 28 }}>{analysis.score}</div>
                                                                <div className="label">/ 100</div>
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div className="score-inline">
                                                                    <div className="score-bar" style={{ flex: 1, height: 8 }}>
                                                                        <div className={`score-bar-fill ${scoreColor(analysis.score)}`} style={{ width: `${analysis.score}%` }} />
                                                                    </div>
                                                                </div>
                                                                {analysis.cms_type && (
                                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>CMS: <strong>{analysis.cms_type}</strong> | {analysis.page_size_kb}KB | スクリプト{analysis.script_count}個</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* 5-Category Bars */}
                                                        <div style={{ marginBottom: 14 }}>
                                                            {catLabel('🔍 SEO基盤', cs.seo, 30, '#3b82f6')}
                                                            {catLabel('📱 UX/モバイル', cs.ux, 25, '#8b5cf6')}
                                                            {catLabel('📣 集客・マーケ', cs.marketing, 25, '#f59e0b')}
                                                            {catLabel('🔒 セキュリティ', cs.security, 10, '#10b981')}
                                                            {catLabel('♿ アクセシビリティ', cs.accessibility, 10, '#6366f1')}
                                                        </div>

                                                        {/* SEO Checks */}
                                                        <div className="fm-portal" style={{ marginBottom: 8 }}>
                                                            <div className="fm-portal-header"><span>🔍 SEO基盤（{cs.seo}/30）</span></div>
                                                            <div className="fm-portal-body">
                                                                <div className="check-grid">
                                                                    {check(analysis.has_ssl, 'SSL (HTTPS)')}
                                                                    {check(!!analysis.page_title, 'ページタイトル')}
                                                                    {check(!!analysis.meta_description, 'meta description')}
                                                                    {check(analysis.has_proper_h1, 'H1見出し構造')}
                                                                    {check(analysis.has_sitemap, 'sitemap.xml')}
                                                                    {check(analysis.has_robots_txt, 'robots.txt')}
                                                                    {check(analysis.has_structured_data, '構造化データ')}
                                                                    {check(analysis.has_canonical, 'canonical URL')}
                                                                    {check(analysis.has_breadcrumb, 'パンくずリスト')}
                                                                    {check(!analysis.has_noindex, 'noindex未設定')}
                                                                    {check(analysis.has_faq_schema, 'FAQスキーマ')}
                                                                    {check(analysis.internal_link_count >= 3, `内部リンク (${analysis.internal_link_count}件)`)}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* UX Checks */}
                                                        <div className="fm-portal" style={{ marginBottom: 8 }}>
                                                            <div className="fm-portal-header"><span>📱 UX/モバイル（{cs.ux}/25）</span></div>
                                                            <div className="fm-portal-body">
                                                                <div className="check-grid">
                                                                    {check(analysis.is_responsive, 'レスポンシブ対応')}
                                                                    {check(analysis.page_size_kb <= 500, `ページサイズ (${analysis.page_size_kb}KB)`)}
                                                                    {check(analysis.has_image_optimization, '画像最適化 (WebP)')}
                                                                    {check(analysis.has_favicon, 'ファビコン')}
                                                                    {check(analysis.has_apple_touch_icon, 'Apple Touch Icon')}
                                                                    {check(!analysis.has_auto_carousel, '自動カルーセル無し')}
                                                                    {check(!analysis.has_autoplay_video, '自動再生動画無し')}
                                                                    {check(analysis.font_size_ok, 'フォント16px以上')}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Marketing Checks */}
                                                        <div className="fm-portal" style={{ marginBottom: 8 }}>
                                                            <div className="fm-portal-header"><span>📣 集客・マーケ（{cs.marketing}/25）</span></div>
                                                            <div className="fm-portal-body">
                                                                <div className="check-grid">
                                                                    {check(analysis.has_ogp, 'OGPタグ')}
                                                                    {check(analysis.has_sns_links, 'SNS連携')}
                                                                    {check(analysis.has_analytics, 'アクセス解析')}
                                                                    {check(analysis.has_form_cta, 'フォーム/CTA')}
                                                                    {check(analysis.has_tel_link, '電話クリッカブル')}
                                                                    {check(analysis.has_video_content, '動画コンテンツ')}
                                                                    {check(analysis.has_line_link, 'LINE連携')}
                                                                    {check(analysis.has_reviews_ugc, 'お客様の声/口コミ')}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Security & Accessibility */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                                            <div className="fm-portal">
                                                                <div className="fm-portal-header"><span>🔒 セキュリティ（{cs.security}/10）</span></div>
                                                                <div className="fm-portal-body">
                                                                    <div className="check-grid" style={{ gridTemplateColumns: '1fr' }}>
                                                                        {check(analysis.has_security_headers, 'セキュリティヘッダー')}
                                                                        {check(analysis.has_hsts, 'HSTS')}
                                                                        {check(!analysis.has_mixed_content, '混在コンテンツ無し')}
                                                                        {check(!parseIssues(analysis.issues).some(i => i.includes('未更新') || i.includes('停止')), '定期更新')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="fm-portal">
                                                                <div className="fm-portal-header"><span>♿ アクセシビリティ（{cs.accessibility}/10）</span></div>
                                                                <div className="fm-portal-body">
                                                                    <div className="check-grid" style={{ gridTemplateColumns: '1fr' }}>
                                                                        {check(analysis.has_lang_attr, 'lang属性')}
                                                                        {check(analysis.heading_structure_ok, '見出し構造')}
                                                                        {check(analysis.images_without_alt === 0, `alt属性 (不足${analysis.images_without_alt}枚)`)}
                                                                        {check(analysis.has_aria, 'WAI-ARIA')}
                                                                        {check(analysis.has_skip_link, 'スキップリンク')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Page Info */}
                                                        {analysis.page_title && (
                                                            <div className="fm-field" style={{ marginTop: 6 }}>
                                                                <span className="fm-field-label">ページタイトル ({analysis.page_title.length}文字)</span>
                                                                <div className="fm-field-value">{analysis.page_title}</div>
                                                            </div>
                                                        )}
                                                        {analysis.meta_description && (
                                                            <div className="fm-field" style={{ marginTop: 4 }}>
                                                                <span className="fm-field-label">description ({analysis.meta_description.length}文字)</span>
                                                                <div className="fm-field-value" style={{ fontSize: 11 }}>{analysis.meta_description}</div>
                                                            </div>
                                                        )}

                                                        {/* Praises — 良い点を先に */}
                                                        {parseIssues(analysis.praises).length > 0 && (
                                                            <div className="fm-portal" style={{ marginTop: 8 }}>
                                                                <div className="fm-portal-header" style={{ background: '#e8f5e9' }}>
                                                                    <span>👏 良い点・評価ポイント</span>
                                                                    <span style={{ color: '#2e7d32', fontWeight: 700 }}>{parseIssues(analysis.praises).length} 件</span>
                                                                </div>
                                                                <div className="fm-portal-body" style={{ background: '#f1f8e9' }}>
                                                                    <ul style={{ padding: '0 12px', listStyle: 'none', margin: 0 }}>
                                                                        {parseIssues(analysis.praises).map((praise: string, i: number) => (
                                                                            <li key={i} style={{ padding: '4px 0', fontSize: 12, color: '#2e7d32', borderBottom: '1px solid #c8e6c9' }}>{praise}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Issues — 改善点 */}
                                                        {parseIssues(analysis.issues).length > 0 && (
                                                            <div className="fm-portal" style={{ marginTop: 8 }}>
                                                                <div className="fm-portal-header">
                                                                    <span>💡 改善できるポイント</span>
                                                                    <span style={{ color: '#e74c3c', fontWeight: 700 }}>{parseIssues(analysis.issues).length} 件</span>
                                                                </div>
                                                                <div className="fm-portal-body">
                                                                    <ul className="issue-list" style={{ padding: '0 12px' }}>
                                                                        {parseIssues(analysis.issues).map((issue: string, i: number) => (
                                                                            <li key={i}>{issue}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Recommendations — 推奨アクション */}
                                                        {parseIssues(analysis.recommendations).length > 0 && (
                                                            <div className="fm-portal" style={{ marginTop: 8 }}>
                                                                <div className="fm-portal-header" style={{ background: '#e3f2fd' }}>
                                                                    <span>🚀 推奨アクション</span>
                                                                    <span style={{ color: '#1565c0', fontWeight: 700 }}>{parseIssues(analysis.recommendations).length} 件</span>
                                                                </div>
                                                                <div className="fm-portal-body" style={{ background: '#e8eaf6' }}>
                                                                    <ul style={{ padding: '0 12px', listStyle: 'none', margin: 0 }}>
                                                                        {parseIssues(analysis.recommendations).map((rec: string, i: number) => (
                                                                            <li key={i} style={{ padding: '4px 0', fontSize: 12, color: '#283593', borderBottom: '1px solid #c5cae9' }}>{rec}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                                                            <button className="btn btn-sm" onClick={handleAnalyze} disabled={analyzing}>
                                                                {analyzing ? '⏳ 再分析中...' : '🔍 再分析'}
                                                            </button>
                                                            <button className="btn btn-sm btn-success" onClick={handleCreateProposal} disabled={isGenerating}>
                                                                {isGenerating ? `⏳ ${selected?.report_progress}` : '📄 診断レポート生成'}
                                                            </button>
                                                        </div>
                                                    </>
                                                );
                                            })() : (
                                                <div className="empty-state">
                                                    <div className="empty-icon">🔍</div>
                                                    <p>まだ分析されていません</p>
                                                    {selected?.website_url && (
                                                        <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
                                                            {analyzing ? '分析中...' : '🔍 サイト分析を実行（50項目超チェック）'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* === PROPOSALS TAB === */}
                                    {activeTab === 'proposals' && (
                                        <div className="fm-fields">
                                            {proposals.length > 0 ? (
                                                <div className="fm-portal">
                                                    <div className="fm-portal-header">
                                                        <span>📄 診断レポート一覧</span>
                                                        <span>{proposals.length} 件</span>
                                                    </div>
                                                    <div className="fm-portal-body">
                                                        {proposals.map((p) => (
                                                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontWeight: 600 }}>{p.title}</div>
                                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                                        {new Date(p.created_at).toLocaleString('ja-JP')}
                                                                    </div>
                                                                </div>
                                                                <a href={`https://proposal-viewer-zeta.vercel.app/proposals/${p.token}`} target="_blank" className="btn btn-sm btn-primary" rel="noopener">
                                                                    🔗 レポート表示
                                                                </a>
                                                                <button className="btn btn-sm" onClick={() => {
                                                                    const shareUrl = `https://proposal-viewer-zeta.vercel.app/proposals/${p.token}`;
                                                                    navigator.clipboard.writeText(shareUrl);
                                                                    alert(`URLをコピーしました\n${shareUrl}`);
                                                                }}>📋 URL取得</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="empty-state">
                                                    <div className="empty-icon">📄</div>
                                                    <p>診断レポートがまだありません</p>
                                                    {analysis && (
                                                        <button className="btn btn-primary" onClick={handleCreateProposal} disabled={isGenerating}>
                                                            {isGenerating ? `⏳ ${selected?.report_progress}` : '📄 診断レポート生成'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* === EMAILS TAB === */}
                                    {activeTab === 'emails' && (
                                        <div className="fm-fields">
                                            {emails.length > 0 ? (
                                                <div className="fm-portal">
                                                    <div className="fm-portal-header">
                                                        <span>✉️ メール履歴</span>
                                                        <span>{emails.length} 件</span>
                                                    </div>
                                                    <div className="fm-portal-body">
                                                        {emails.map((em) => (
                                                            <div key={em.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}>
                                                                <span className={`badge badge-${em.status}`}>{em.status === 'draft' ? '下書き' : em.status === 'approved' ? '承認済' : '送信済'}</span>
                                                                <div style={{ flex: 1 }}>{em.subject}</div>
                                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                                    {new Date(em.created_at).toLocaleDateString('ja-JP')}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="empty-state">
                                                    <div className="empty-icon">✉️</div>
                                                    <p>メール送信履歴がありません</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* === HISTORY TAB === */}
                                    {activeTab === 'history' && (
                                        <div className="fm-fields">
                                            <div className="fm-field-grid" style={{ marginBottom: 12 }}>
                                                <div className="fm-field">
                                                    <span className="fm-field-label">登録日</span>
                                                    <div className="fm-field-value">{new Date(selected.created_at).toLocaleString('ja-JP')}</div>
                                                </div>
                                                <div className="fm-field">
                                                    <span className="fm-field-label">ステータス</span>
                                                    <div className="fm-field-value"><span className={`badge badge-${selected.status}`}>{STATUS_LABELS[selected.status]}</span></div>
                                                </div>
                                            </div>

                                            {events.length > 0 ? (
                                                <div className="fm-portal">
                                                    <div className="fm-portal-header">
                                                        <span>📊 アクティビティログ</span>
                                                        <span>{events.length} 件</span>
                                                    </div>
                                                    <div className="fm-portal-body">
                                                        {events.map((ev, i) => (
                                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 11 }}>
                                                                <span>{ev.event_type === 'email_open' ? '📩' : ev.event_type === 'proposal_view' ? '👀' : '🔗'}</span>
                                                                <div style={{ flex: 1 }}>
                                                                    {ev.event_type === 'email_open' ? 'メール開封' :
                                                                        ev.event_type === 'proposal_view' ? '診断レポート閲覧' : 'リンククリック'}
                                                                </div>
                                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                                    {new Date(ev.created_at).toLocaleString('ja-JP')}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="empty-state">
                                                    <div className="empty-icon">📊</div>
                                                    <p>アクティビティ履歴がまだありません</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="empty-state" style={{ padding: 60 }}>
                                <div className="empty-icon">🏢</div>
                                <p>リードを選択するか、新規追加してください</p>
                                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>＋ 新規レコード追加</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ===== ADD MODAL ===== */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🏢 新規リード追加</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>企業名 *</label>
                                <input className="form-control" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="株式会社〇〇" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>業種</label>
                                    <input className="form-control" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="飲食店, 美容室..." />
                                </div>
                                <div className="form-group">
                                    <label>エリア</label>
                                    <input className="form-control" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="東京都渋谷区" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>電話番号</label>
                                    <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="03-XXXX-XXXX" />
                                </div>
                                <div className="form-group">
                                    <label>メールアドレス</label>
                                    <input className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@example.com" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>WEBサイトURL</label>
                                <input className="form-control" value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} placeholder="https://example.com" />
                            </div>
                            <div className="form-group">
                                <label>メモ</label>
                                <textarea className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Googleマイビジネスからの情報など" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowAddModal(false)}>キャンセル</button>
                            <button className="btn btn-primary" onClick={handleAdd}>追加</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
