// Twilio SMS helper
// Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env.local
// Free trial: ~$15 credit ≈ 1,900 SMS at $0.0079 each

export async function sendSMS(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    // Demo mode: just log instead of sending
    console.log(`[SMS DEMO] To: ${to} | Message: ${body}`);
    return { success: true };
  }

  try {
    const twilio = require('twilio')(accountSid, authToken);
    await twilio.messages.create({ body, from, to });
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[SMS Error]', message);
    return { success: false, error: message };
  }
}
