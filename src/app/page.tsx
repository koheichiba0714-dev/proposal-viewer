'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

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

const PIPELINE_STEPS = [
  { key: 'total', icon: '🏢', label: '総リード数', color: '#667eea' },
  { key: 'analyzed', icon: '🔍', label: '分析済み', color: '#f59e0b' },
  { key: 'sent', icon: '✉️', label: '提案送信', color: '#8b5cf6' },
  { key: 'opened', icon: '📬', label: '開封', color: '#f97316' },
  { key: 'clicked', icon: '🔥', label: 'LP閲覧', color: '#10b981' },
];

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

  const isNewUser = stats.total === 0;

  return (
    <div>
      <div className="toolbar">
        <span style={{ fontWeight: 700, fontSize: 14 }}>📊 ダッシュボード</span>
        <div className="toolbar-divider" />
        <span className="toolbar-label">営業パイプラインの全体概要</span>
      </div>

      <div className="page-area">

        {/* Pipeline Funnel */}
        <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${PIPELINE_STEPS.length + 1}, 1fr)` }}>
          {PIPELINE_STEPS.map(step => {
            const val = stats[step.key as keyof DashboardStats] as number;
            return (
              <div className="stat-card" key={step.key} style={{ borderTop: `3px solid ${step.color}` }}>
                <div className="stat-icon">{step.icon}</div>
                <div className="stat-value" style={{ color: step.color }}>{val}</div>
                <div className="stat-label">{step.label}</div>
              </div>
            );
          })}
          <div className="stat-card" style={{ borderTop: '3px solid #667eea' }}>
            <div className="stat-icon">📊</div>
            <div className="stat-value" style={{ color: '#667eea' }}>{stats.avgScore}</div>
            <div className="stat-label">平均スコア</div>
          </div>
        </div>

        {/* Conversion funnel bar */}
        {stats.total > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)' }}>📈 コンバージョンファネル</div>
              <div style={{ display: 'flex', gap: 4, height: 32, borderRadius: 8, overflow: 'hidden', background: '#e2e8f0' }}>
                {PIPELINE_STEPS.map((step, i) => {
                  const val = stats[step.key as keyof DashboardStats] as number;
                  const pct = stats.total > 0 ? (val / stats.total) * 100 : 0;
                  return pct > 0 ? (
                    <div key={step.key} style={{
                      width: `${pct}%`, background: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 10, fontWeight: 700, minWidth: pct > 5 ? 0 : 24,
                      transition: 'width 0.5s ease'
                    }} title={`${step.label}: ${val}件 (${Math.round(pct)}%)`}>
                      {pct > 8 ? `${step.label} ${Math.round(pct)}%` : ''}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}

        {/* Onboarding for new users */}
        {isNewUser && (
          <div className="card" style={{ border: '2px dashed var(--accent)', background: 'rgba(102, 126, 234, 0.03)' }}>
            <div className="card-body" style={{ padding: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Sales DXへようこそ！</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>以下の3ステップで営業を自動化しましょう</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { step: 1, icon: '🗺️', title: 'リード収集', desc: 'Googleマップからターゲット企業を自動収集', href: '/scrape', btn: 'マップ収集へ' },
                  { step: 2, icon: '🔍', title: 'サイト分析', desc: '企業サイトをAIが自動採点・課題抽出', href: '/leads', btn: 'リード管理へ' },
                  { step: 3, icon: '✉️', title: 'メール送信', desc: 'パーソナライズされた営業メールを生成・送信', href: '/leads', btn: 'メール作成へ' },
                ].map(item => (
                  <div key={item.step} style={{
                    padding: 20, background: 'white', borderRadius: 12, border: '1px solid var(--border)',
                    textAlign: 'center', position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-gradient)',
                      color: 'white', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{item.step}</div>
                    <div style={{ fontSize: 32, margin: '8px 0 12px' }}>{item.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>{item.desc}</div>
                    <Link href={item.href} className="btn btn-primary btn-sm">{item.btn}</Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Leads Table */}
        <div className="card">
          <div className="card-header">
            <h3>📋 最近のリード</h3>
            <Link href="/leads" className="btn btn-sm btn-primary">リード管理へ →</Link>
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
                      <td><Link href="/leads" style={{ color: 'var(--text-link)', fontWeight: 600, textDecoration: 'none' }}>{lead.company_name}</Link></td>
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
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(lead.created_at).toLocaleDateString('ja-JP')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <p>まだリードが登録されていません</p>
                <Link href="/scrape" className="btn btn-primary">🗺️ Googleマップから収集する</Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Guide - as collapsible card only when user has data */}
        {!isNewUser && (
          <div className="card">
            <div className="card-header">
              <h3>📖 使い方ガイド</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, fontSize: 13 }}>
                {[
                  { step: '1', title: 'リード登録', desc: 'リード管理 → 新規レコード追加で企業名とURLを入力', color: '#667eea' },
                  { step: '2', title: 'サイト分析', desc: 'ツールバーの「サイト分析」ボタンで自動チェック', color: '#f59e0b' },
                  { step: '3', title: '提案LP生成', desc: '分析結果タブから「提案LP生成」で個社別LP作成', color: '#8b5cf6' },
                  { step: '4', title: 'メール送信', desc: 'メールタブでAI生成→プレビュー→送信', color: '#10b981' },
                ].map(item => (
                  <div key={item.step} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)', borderLeft: `3px solid ${item.color}` }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: item.color, color: 'white', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{item.step}</span>
                      {item.title}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
