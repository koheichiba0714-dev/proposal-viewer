'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NavItems = [
    { href: '/', icon: '📊', label: 'ダッシュボード' },
    { href: '/leads', icon: '🏢', label: 'リード管理' },
    { href: '/scrape', icon: '🗺️', label: 'Googleマップ収集' },
    { href: '/emails', icon: '✉️', label: 'メール管理' },
    { href: '/tracking', icon: '📈', label: '計測・架電' },
];

export default function Sidebar() {
    const pathname = usePathname();

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
        </nav>
    );
}
