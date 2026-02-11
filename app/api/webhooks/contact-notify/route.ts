import { NextResponse } from 'next/server';
import { sendContactNotification } from '@/lib/contact-email';

const NOTIFY_EMAIL = 'info@bluestonebrands.com';

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: {
    id?: number;
    name?: string;
    email?: string;
    reason?: string;
    subject?: string;
    message?: string;
    created_at?: string;
  };
};

function hasRequiredRecord(
  r: unknown
): r is { name: string; email: string; reason: string; subject: string; message: string } {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  return (
    typeof o.name === 'string' &&
    typeof o.email === 'string' &&
    typeof o.reason === 'string' &&
    typeof o.subject === 'string' &&
    typeof o.message === 'string'
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WebhookPayload;
    if (body?.type !== 'INSERT' || body?.table !== 'contact_messages') {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }
    const record = body.record;
    if (!hasRequiredRecord(record)) {
      return NextResponse.json(
        { error: 'Missing or invalid record fields' },
        { status: 400 }
      );
    }
    const result = await sendContactNotification(NOTIFY_EMAIL, {
      name: record.name,
      email: record.email,
      reason: record.reason,
      subject: record.subject,
      message: record.message,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Contact webhook error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
