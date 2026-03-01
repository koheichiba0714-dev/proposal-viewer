'use client';

import { useEffect, useState, useCallback } from 'react';

interface Lead {
    id: number;
    company_name: string;
    industry: string;
    area: string;
    email: string;
    website_url: string;
    status: string;
}

interface Proposal {
    id: number;
    lead_id: number;
    token: string;
    company_name: string;
}

interface Email {
    id: number;
    lead_id: number;
    subject: string;
    body_html: string;
    status: string;
    company_name: string;
    lead_email: string;
    sent_at: string;
    created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
    draft: '下書き', approved: '承認済', sent: '送信済',
};

export default function EmailsPage() {
    const [emails, setEmails] = useState<Email[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompose, setShowCompose] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewEmail, setPreviewEmail] = useState<Email | null>(null);

    const [composeForm, setComposeForm] = useState({
        lead_id: '',
        subject: '',
        body_html: '',
    });

    const loadData = useCallback(async () => {
        const [emailsRes, leadsRes, proposalsRes] = await Promise.all([
            fetch('/api/emails'),
            fetch('/api/leads'),
            fetch('/api/proposals'),
        ]);
        setEmails(await emailsRes.json());
        setLeads(await leadsRes.json());
        setProposals(await proposalsRes.json());
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSelectLead = (leadId: string) => {
        const lead = leads.find(l => l.id === parseInt(leadId));
        const proposal = proposals.find(p => p.lead_id === parseInt(leadId));

        if (lead) {
            const proposalUrl = proposal ? `${window.location.origin}/proposals/${proposal.token}` : '[提案LP未作成]';
            const trackingPixelUrl = `${window.location.origin}/api/tracking?lid=${lead.id}&eid=__EMAIL_ID__&t=email_open`;

            setComposeForm({
                lead_id: leadId,
                subject: `${lead.company_name}様 ホームページ改善のご提案`,
                body_html: `<p>${lead.company_name} ご担当者様</p>
<p>突然のご連絡失礼いたします。</p>
<p>私どもはWEB制作を専門としており、${lead.area ? lead.area + 'エリア' : ''}${lead.industry ? 'の' + lead.industry + '業界' : ''}のお客様のホームページ改善をお手伝いしております。</p>
<p>貴社のホームページを拝見し、いくつかの改善ポイントをまとめた<strong>無料診断レポート</strong>をご用意いたしました。</p>
<p>▼ 貴社専用の改善提案ページ<br>
<a href="${proposalUrl}">${proposalUrl}</a></p>
<p>ぜひご覧いただけますと幸いです。<br>
ご不明点やご質問がございましたら、お気軽にご連絡ください。</p>
<p>何卒よろしくお願いいたします。</p>
<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" />`,
            });
        }
    };

    const handleCreateDraft = async () => {
        if (!composeForm.lead_id || !composeForm.subject) return;
        await fetch('/api/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lead_id: parseInt(composeForm.lead_id),
                subject: composeForm.subject,
                body_html: composeForm.body_html,
            }),
        });
        setShowCompose(false);
        setComposeForm({ lead_id: '', subject: '', body_html: '' });
        loadData();
    };

    const handleApprove = async (emailId: number) => {
        await fetch('/api/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve', email_id: emailId }),
        });
        loadData();
    };

    const handleSend = async (emailId: number) => {
        if (!confirm('このメールを実際に送信しますか？\n※ Resend API 経由で相手のメールアドレスに届きます')) return;
        try {
            const res = await fetch('/api/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send', email_id: emailId }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(`❌ 送信失敗: ${data.error}`);
                return;
            }
            alert(`✅ ${data.message}`);
            loadData();
        } catch {
            alert('❌ 通信エラーが発生しました');
        }
    };

    const handlePreview = (email: Email) => {
        setPreviewEmail(email);
        setShowPreview(true);
    };

    if (loading) return <div className="loading">読み込み中...</div>;

    return (
        <div>
            <div className="toolbar">
                <span style={{ fontWeight: 700, fontSize: 14 }}>✉️ メール管理</span>
                <div className="toolbar-divider" />
                <span className="toolbar-label">提案メールの作成・承認・送信</span>
                <div style={{ flex: 1 }} />
                <button className="toolbar-btn primary" onClick={() => setShowCompose(true)}>✉️ 新規メール作成</button>
            </div>

            <div className="page-area">
                {emails.length === 0 ? (
                    <div className="card">
                        <div className="card-body">
                            <div className="empty-state">
                                <div className="empty-icon">📮</div>
                                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>メールはまだありません</p>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 20px', lineHeight: 1.6 }}>
                                    リード管理画面で企業を選択 →「メール」タブからAIで営業メールを自動生成できます。<br />
                                    または、下のボタンから直接作成できます。
                                </p>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                    <button className="btn btn-primary" onClick={() => setShowCompose(true)}>✉️ メール作成</button>
                                    <a href="/leads" className="btn">🏢 リード管理へ</a>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="card">
                        <div className="card-header">
                            <h3>メール一覧</h3>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emails.length} 件</span>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>企業名</th>
                                        <th>件名</th>
                                        <th>ステータス</th>
                                        <th>作成日</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {emails.map((email) => (
                                        <tr key={email.id}>
                                            <td><strong>{email.company_name}</strong></td>
                                            <td>{email.subject}</td>
                                            <td><span className={`badge badge-${email.status}`}>{STATUS_LABELS[email.status]}</span></td>
                                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {new Date(email.created_at).toLocaleDateString('ja-JP')}
                                            </td>
                                            <td>
                                                <div className="btn-group">
                                                    <button className="btn btn-sm" onClick={() => handlePreview(email)}>👁️</button>
                                                    {email.status === 'draft' && (
                                                        <button className="btn btn-sm btn-primary" onClick={() => handleApprove(email.id)}>✅ 承認</button>
                                                    )}
                                                    {email.status === 'approved' && (
                                                        <button className="btn btn-sm btn-success" onClick={() => handleSend(email.id)}>📤 送信</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Compose Modal */}
            {showCompose && (
                <div className="modal-overlay" onClick={() => setShowCompose(false)}>
                    <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>✉️ メール作成</h3>
                            <button className="modal-close" onClick={() => setShowCompose(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>送信先リード *</label>
                                <select className="form-control" value={composeForm.lead_id} onChange={e => handleSelectLead(e.target.value)}>
                                    <option value="">-- リードを選択 --</option>
                                    {leads.filter(l => l.status !== 'new').map(l => (
                                        <option key={l.id} value={l.id}>{l.company_name} ({l.email || 'メール未設定'})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>件名 *</label>
                                <input className="form-control" value={composeForm.subject} onChange={e => setComposeForm({ ...composeForm, subject: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>本文 (HTML)</label>
                                <textarea className="form-control" style={{ minHeight: 200, fontFamily: 'monospace', fontSize: 11 }} value={composeForm.body_html} onChange={e => setComposeForm({ ...composeForm, body_html: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>プレビュー</label>
                                <div className="email-preview" dangerouslySetInnerHTML={{ __html: composeForm.body_html }} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowCompose(false)}>キャンセル</button>
                            <button className="btn btn-primary" onClick={handleCreateDraft}>💾 下書き保存</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && previewEmail && (
                <div className="modal-overlay" onClick={() => setShowPreview(false)}>
                    <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📧 メールプレビュー</h3>
                            <button className="modal-close" onClick={() => setShowPreview(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                                <strong>宛先:</strong> {previewEmail.company_name} ({previewEmail.lead_email || '未設定'})<br />
                                <strong>件名:</strong> {previewEmail.subject}
                            </div>
                            <div className="email-preview" dangerouslySetInnerHTML={{ __html: previewEmail.body_html }} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowPreview(false)}>閉じる</button>
                            {previewEmail.status === 'draft' && (
                                <button className="btn btn-primary" onClick={() => { handleApprove(previewEmail.id); setShowPreview(false); }}>✅ 承認</button>
                            )}
                            {previewEmail.status === 'approved' && (
                                <button className="btn btn-success" onClick={() => { handleSend(previewEmail.id); setShowPreview(false); }}>📤 送信</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
