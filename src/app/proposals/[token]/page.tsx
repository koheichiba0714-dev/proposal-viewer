'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface ProposalData {
    proposal: {
        title: string;
        improvements: string;
        sample_url: string;
        report_html: string;
        created_at: string;
    };
    company: Record<string, unknown>;
    analysis: Record<string, unknown> | null;
}

export default function ProposalPage() {
    const params = useParams();
    const token = params.token as string;
    const [data, setData] = useState<ProposalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/proposals/${token}`)
            .then(res => {
                if (!res.ok) throw new Error('提案が見つかりません');
                return res.json();
            })
            .then((json: ProposalData) => {
                setData(json);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [token]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: '#f8f9fa',
                fontFamily: '"Noto Sans JP", sans-serif',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        border: '4px solid #e0e0e0',
                        borderTop: '4px solid #1b2e4b',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px',
                    }} />
                    <p style={{ color: '#666', fontSize: 14 }}>レポートを読み込み中...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: '#f8f9fa',
                fontFamily: '"Noto Sans JP", sans-serif',
            }}>
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <h1 style={{ fontSize: 24, color: '#c0392b', marginBottom: 12 }}>⚠️ エラー</h1>
                    <p style={{ color: '#666' }}>{error || '提案データが見つかりません'}</p>
                </div>
            </div>
        );
    }

    const { proposal } = data;

    // If we have AI-generated report HTML, render it directly
    if (proposal.report_html) {
        return (
            <iframe
                srcDoc={proposal.report_html}
                title={proposal.title}
                sandbox="allow-scripts allow-same-origin"
                style={{
                    width: '100%',
                    height: '100vh',
                    border: 'none',
                    display: 'block',
                }}
            />
        );
    }

    // Fallback: simple message if no report_html (legacy proposals)
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#f8f9fa',
            fontFamily: '"Noto Sans JP", sans-serif',
        }}>
            <div style={{ textAlign: 'center', padding: 40, maxWidth: 600 }}>
                <h1 style={{ fontSize: 20, color: '#1b2e4b', marginBottom: 16 }}>{proposal.title}</h1>
                <p style={{ color: '#666', marginBottom: 24, lineHeight: 1.8 }}>
                    このレポートは旧バージョンで生成されたため、完全な表示ができません。<br />
                    新しいレポートを生成してください。
                </p>
                {proposal.sample_url && (
                    <a
                        href={proposal.sample_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            background: '#1b2e4b',
                            color: '#fff',
                            padding: '12px 32px',
                            borderRadius: 4,
                            textDecoration: 'none',
                            fontSize: 14,
                        }}
                    >
                        🆕 リニューアルイメージを見る
                    </a>
                )}
            </div>
        </div>
    );
}
