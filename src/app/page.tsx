'use client';

import { useEffect, useState, useCallback } from 'react';

interface DashboardStats {
  total: number;
  analyzed: number;
  sent: number;
  opened: number;
  clicked: number;
  avgScore: number;
}

interface RecentLead {
  id: number;
  company_name: string;
  status: string;
  score: number;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: '新規', analyzed: '分析済', proposal_sent: '提案送信済',
  opened: '開封済', clicked: 'LP閲覧', called: '架電済',
  appointed: 'アポ獲得', rejected: '見送り',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({ total: 0, analyzed: 0, sent: 0, opened: 0, clicked: 0, avgScore: 0 });
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [leadsRes, trackingRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/tracking/events'),
      ]);
      const leads = await leadsRes.json();
      const tracking = await trackingRes.json();

      const analyzed = leads.filter((l: RecentLead) => l.status !== 'new').length;
      const sent = leads.filter((l: RecentLead) => ['proposal_sent', 'opened', 'clicked', 'called', 'appointed'].includes(l.status)).length;
      const opened = leads.filter((l: RecentLead) => ['opened', 'clicked', 'called', 'appointed'].includes(l.status)).length;
      const clicked = leads.filter((l: RecentLead) => ['clicked', 'called', 'appointed'].includes(l.status)).length;
      const scores = leads.filter((l: RecentLead) => l.score > 0).map((l: RecentLead) => l.score);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

      setStats({ total: leads.length, analyzed, sent, opened, clicked, avgScore });
      setRecentLeads(leads.slice(0, 10));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="loading">読み込み中...</div>;

  return (
    <div>
      <div className="toolbar">
        <span style={{ fontWeight: 600, fontSize: 13 }}>📊 ダッシュボード</span>
        <div className="toolbar-divider" />
        <span className="toolbar-label">営業パイプラインの全体概要</span>
      </div>

      <div className="page-area">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🏢</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">総リード数</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔍</div>
            <div className="stat-value">{stats.analyzed}</div>
            <div className="stat-label">分析済み</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✉️</div>
            <div className="stat-value">{stats.sent}</div>
            <div className="stat-label">提案送信済</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👀</div>
            <div className="stat-value">{stats.opened}</div>
            <div className="stat-label">開封済</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-value">{stats.clicked}</div>
            <div className="stat-label">LP閲覧済</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{stats.avgScore}</div>
            <div className="stat-label">平均スコア</div>
          </div>
        </div>

        {/* Recent Leads Table */}
        <div className="card">
          <div className="card-header">
            <h3>📋 最近のリード</h3>
            <a href="/leads" className="btn btn-sm btn-primary">リード管理へ →</a>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentLeads.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>企業名</th>
                    <th>ステータス</th>
                    <th>スコア</th>
                    <th>登録日</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map(lead => (
                    <tr key={lead.id}>
                      <td><a href="/leads" style={{ color: 'var(--text-link)', fontWeight: 600, textDecoration: 'none' }}>{lead.company_name}</a></td>
                      <td><span className={`badge badge-${lead.status}`}>{STATUS_LABELS[lead.status]}</span></td>
                      <td>
                        {lead.score > 0 && (
                          <div className="score-inline">
                            <div className="score-bar">
                              <div className={`score-bar-fill ${lead.score >= 70 ? 'score-high' : lead.score >= 40 ? 'score-mid' : 'score-low'}`} style={{ width: `${lead.score}%` }} />
                            </div>
                            <span className="score-text">{lead.score}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(lead.created_at).toLocaleDateString('ja-JP')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <p>まだリードが登録されていません</p>
                <a href="/leads" className="btn btn-primary">＋ リード管理へ</a>
              </div>
            )}
          </div>
        </div>

        {/* Quick Guide */}
        <div className="card">
          <div className="card-header">
            <h3>📖 使い方ガイド</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12 }}>
              <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Step 1: リード登録</div>
                <div style={{ color: 'var(--text-secondary)' }}>リード管理 → 新規レコード追加で企業名とURLを入力</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Step 2: サイト分析</div>
                <div style={{ color: 'var(--text-secondary)' }}>ツールバーの「サイト分析」ボタンで自動チェック</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Step 3: 提案LP生成</div>
                <div style={{ color: 'var(--text-secondary)' }}>分析結果タブから「提案LP生成」で個社別LP作成</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Step 4: メール送信</div>
                <div style={{ color: 'var(--text-secondary)' }}>メール管理でテンプレート生成→承認→送信</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
