import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error('RESEND_API_KEY が設定されていません。.env.local に設定してください。');
    }
    _resend = new Resend(key);
  }
  return _resend;
}

interface SendEmailResult {
  id: string;
}

/**
 * Resend API でメールを送信する
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendEmailResult> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM || 'Sales DX <onboarding@resend.dev>';

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error('[email] Resend error:', error);
    throw new Error(`メール送信に失敗しました: ${error.message}`);
  }

  console.log(`[email] Sent to ${to} — Resend ID: ${data?.id}`);
  return { id: data?.id || '' };
}
