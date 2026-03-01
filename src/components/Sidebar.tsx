'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const NavItems = [
    { href: '/', icon: '📊', label: 'ダッシュボード' },
    { href: '/leads', icon: '🏢', label: 'リード管理' },
    { href: '/scrape', icon: '🗺️', label: 'Googleマップ収集' },
    { href: '/emails', icon: '✉️', label: 'メール管理' },
    { href: '/tracking', icon: '📈', label: '計測・架電' },
];

interface MiniStats {
    total: number;
    sent: number;
    opened: number;
}

export default function Sidebar() {
    const pathname = usePathname();
    const [miniStats, setMiniStats] = useState<MiniStats>({ total: 0, sent: 0, opened: 0 });

    useEffect(() => {
        fetch('/api/leads')
            .then(r => r.json())
            .then((leads: { status: string }[]) => {
                const total = leads.length;
                const sent = leads.filter(l => ['proposal_sent', 'opened', 'clicked', 'called', 'appointed'].includes(l.status)).length;
                const opened = leads.filter(l => ['opened', 'clicked', 'called', 'appointed'].includes(l.status)).length;
                setMiniStats({ total, sent, opened });
            })
            .catch(() => { });
    }, []);

    // Don't render sidebar on proposal pages
    if (pathname?.startsWith('/proposals/')) return null;

    return (
        <nav className="sidebar">
            <div className="sidebar-logo">
                <h1>Sales DX</h1>
                <span>営業自動化プラットフォーム</span>
            </div>
            <div className="sidebar-nav">
                {NavItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={pathname === item.href ? 'active' : ''}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </div>
            {/* Mini Dashboard */}
            <div style={{
                padding: '12px 14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: 11
            }}>
                <div style={{ color: 'rgba(255, 255, 255, 0.35)', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                    TODAY&apos;S OVERVIEW
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>リード</span>
                    <span style={{ color: '#a5b4fc', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{miniStats.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>送信済</span>
                    <span style={{ color: '#a5b4fc', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{miniStats.sent}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>開封</span>
                    <span style={{ color: '#a5b4fc', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{miniStats.opened}</span>
                </div>
            </div>
        </nav>
    );
}
