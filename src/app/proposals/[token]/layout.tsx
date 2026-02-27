import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ホームページ改善提案",
    description: "WEBサイト無料診断レポート",
};

export default function ProposalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="proposal-layout-standalone">
            {children}
        </div>
    );
}
