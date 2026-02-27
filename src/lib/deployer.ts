import { Client } from 'basic-ftp';
import { Readable } from 'stream';

const FTP_HOST = process.env.FTP_HOST || 'sv2328.xserver.jp';
const FTP_USER = process.env.FTP_USER || 'cfm3';
const FTP_PASSWORD = process.env.FTP_PASSWORD || '';
const FTP_BASE_DIR = process.env.FTP_BASE_DIR || '/cfarm-test2.site/public_html/samples';
const SAMPLE_BASE_URL = process.env.SAMPLE_BASE_URL || 'https://cfarm-test2.site/samples';

export async function deployToServer(leadId: number, html: string): Promise<string> {
    const client = new Client();
    client.ftp.verbose = false;

    try {
        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASSWORD,
            secure: 'implicit',
            port: 21,
            secureOptions: { rejectUnauthorized: false },
        });

        const remotePath = `${FTP_BASE_DIR}/${leadId}`;

        // Ensure directory exists
        await client.ensureDir(remotePath);

        // Upload HTML as index.html
        const stream = Readable.from(Buffer.from(html, 'utf-8'));
        await client.uploadFrom(stream, `${remotePath}/index.html`);

        return `${SAMPLE_BASE_URL}/${leadId}/`;
    } finally {
        client.close();
    }
}
