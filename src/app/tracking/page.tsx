'use client';

import { useEffect, useState, useCallback } from 'react';

interface TrackingEvent {
    id: number;
    lead_id: number;
    email_id: number;
    event_type: string;
    created_at: string;
    company_name: string;
}

interface HotLead {
    id: number;
    company_name: string;
    phone: string;
    email: string;
    status: string;
    score: number;
    last_event: string;
    last_event_time: string;
}

interface Summary {
    opens: number;
    views: number;
    clicks: number;
}

const STATUS_LABELS: Record<string, string> = {
    new: '新規', analyzed: '分析済', proposal_sent: '提案送信済',
    opened: '開封済', clicked: 'LP閲覧', called: '架電済',
    appointed: 'アポ獲得', rejected: '見送り',
};

export default function TrackingPage() {
    const [events, setEvents] = useState<TrackingEvent[]>([]);
    const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
    const [summary, setSummary] = useState<Summary>({ opens: 0, views: 0, clicks: 0 });
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        const res = await fetch('/api/tracking/events');
        const data = await res.json();
        setEvents(data.events || []);
        setHotLeads(data.hotLeads || []);
        setSummary(data.summary || { opens: 0, views: 0, clicks: 0 });
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, [loadData]);

    const handleStatusUpdate = async (leadId: number, status: string) => {
        await fetch(`/api/leads/${leadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        loadData();
    };

    if (loading) return <div className="loading">読み込み中...</div>;

    return (
        <div>
            <div className="toolbar">
                <span style={{ fontWeight: 600, fontSize: 13 }}>📈 計測・架電リスト</span>
                <div className="toolbar-divider" />
                <span className="toolbar-label">リアルタイム追跡 (10秒自動更新)</span>
                <div style={{ flex: 1 }} />
                <span className="toolbar-label" style={{ color: 'rgba(255,255,255,0.4)' }}>🟢 自動更新中</span>
            </div>

            <div className="page-area">
                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">📩</div>
                        <div className="stat-value">{summary.opens}</div>
                        <div className="stat-label">メール開封</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">👀</div>
                        <div className="stat-value">{summary.views}</div>
                        <div className="stat-label">LP閲覧</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🔗</div>
                        <div className="stat-value">{summary.clicks}</div>
                        <div className="stat-label">リンククリック</div>
                    </div>
                </div>

                {/* Hot Leads - Call List */}
                <div className="card">
                    <div className="card-header">
                        <h3>🔥 架電優先リスト（ホットリード）</h3>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hotLeads.length} 件</span>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        {hotLeads.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>企業名</th>
                                        <th>電話番号</th>
                                        <th>直近の反応</th>
                                        <th>ステータス</th>
                                        <th>スコア</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hotLeads.map((lead) => (
                                        <tr key={lead.id}>
                                            <td><strong>{lead.company_name}</strong></td>
                                            <td>
                                                {lead.phone ? (
                                                    <a href={`tel:${lead.phone}`} style={{ color: 'var(--text-link)', textDecoration: 'none' }}>📞 {lead.phone}</a>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                )}
                                            </td>
                                            <td>
                                                <span style={{ fontSize: 11 }}>
                                                    {lead.last_event === 'email_open' ? '📩 開封' :
                                                        lead.last_event === 'proposal_view' ? '👀 LP閲覧' : '🔗 クリック'}
                                                </span>
                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                    {new Date(lead.last_event_time).toLocaleString('ja-JP')}
                                                </div>
                                            </td>
                                            <td><span className={`badge badge-${lead.status}`}>{STATUS_LABELS[lead.status]}</span></td>
                                            <td>
                                                <div className="score-inline">
                                                    <div className="score-bar">
                                                        <div className={`score-bar-fill ${lead.score >= 70 ? 'score-high' : lead.score >= 40 ? 'score-mid' : 'score-low'}`} style={{ width: `${lead.score}%` }} />
                                                    </div>
                                                    <span className="score-text">{lead.score}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="btn-group">
                                                    <button className="btn btn-sm btn-success" onClick={() => handleStatusUpdate(lead.id, 'called')}>📞 架電済</button>
                                                    <button className="btn btn-sm btn-primary" onClick={() => handleStatusUpdate(lead.id, 'appointed')}>🤝 アポ</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">🔥</div>
                                <p>反応があったリードがここに表示されます</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity Timeline */}
                <div className="card">
                    <div className="card-header">
                        <h3>📊 アクティビティタイムライン</h3>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{events.length} 件</span>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        {events.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>イベント</th>
                                        <th>企業名</th>
                                        <th>日時</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((ev) => (
                                        <tr key={ev.id}>
                                            <td>
                                                {ev.event_type === 'email_open' ? '📩 メール開封' :
                                                    ev.event_type === 'proposal_view' ? '👀 LP閲覧' : '🔗 リンククリック'}
                                            </td>
                                            <td><strong>{ev.company_name}</strong></td>
                                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {new Date(ev.created_at).toLocaleString('ja-JP')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">📊</div>
                                <p>アクティビティがまだありません</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
