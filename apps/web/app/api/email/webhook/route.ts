import { NextResponse } from 'next/server';
import { z } from 'zod/v3';
import crypto from 'node:crypto';
import { processIncomingEmail } from '@/lib/email/process-incoming';

// Mailgun webhook payload schema based on their parsed message format
const mailgunWebhookSchema = z.object({
  recipient: z.string(),
  sender: z.string(),
  from: z.string(),
  subject: z.string(),
  'body-plain': z.string(),
  'stripped-text': z.string().optional(),
  'stripped-signature': z.string().optional(),
  'body-html': z.string().optional(),
  'stripped-html': z.string().optional(),
  'attachment-count': z
    .string()
    .optional()
    .transform((n) => (n ? Number.parseInt(n, 10) : 0)),
  timestamp: z.string().transform((n) => Number.parseInt(n, 10)),
  token: z.string(),
  signature: z.string(),
  'message-headers': z.string().transform((str) => {
    try {
      return JSON.parse(str);
    } catch {
      return [];
    }
  }),
});

type MailgunWebhookPayload = z.infer<typeof mailgunWebhookSchema>;

// Verify Mailgun webhook signature
function verifyWebhookSignature(
  timestamp: number,
  token: string,
  signature: string,
): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey)
    throw new Error('MAILGUN_WEBHOOK_SIGNING_KEY not configured');

  const encodedData = timestamp.toString() + token;
  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(encodedData);
  const expectedSignature = hmac.digest('hex');

  return expectedSignature === signature;
}

export async function POST(req: Request) {
  try {
    // Get form data from the request
    const formData = await req.formData();
    const body = Object.fromEntries(formData.entries());

    const result = mailgunWebhookSchema.safeParse(body);

    if (!result.success) {
      console.error('Invalid webhook payload:', result.error);
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 },
      );
    }

    const data = result.data;

    // Verify webhook signature
    if (!verifyWebhookSignature(data.timestamp, data.token, data.signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 },
      );
    }

    // Process the email
    const processResult = await processIncomingEmail({
      from: data.from,
      subject: data.subject,
      textContent: data['stripped-text'] || data['body-plain'],
      htmlContent: data['stripped-html'] || data['body-html'],
    });

    if (!processResult.success) {
      return NextResponse.json(
        { error: processResult.error || 'Failed to process email' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
