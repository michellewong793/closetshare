import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/twilio';

export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing "to" or "message"' }, { status: 400 });
    }

    // Normalize phone number — ensure it starts with +
    const normalized = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`;

    const result = await sendSMS(normalized, message);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('/api/notify error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
