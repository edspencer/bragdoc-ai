import { render } from '@react-email/render';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { WelcomeEmail } from '@/components/email/WelcomeEmail';

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY!;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN!;
const FROM_EMAIL = 'hello@bragdoc.ai';

// Initialize Mailgun
const mailgun = new Mailgun(formData);
const client = mailgun.client({ username: 'api', key: MAILGUN_API_KEY });

interface SendWelcomeEmailParams {
  to: string;
  userId: string;
  username: string;
  loginUrl: string;
}

// Simplified welcome email that doesn't require unsubscribe functionality
export const sendWelcomeEmail = async ({
  to,
  userId,
  username,
  loginUrl,
}: SendWelcomeEmailParams) => {
  try {
    // For now, use a placeholder unsubscribe URL - this can be enhanced later
    const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/unsubscribed?placeholder=true`;
    const html = await render(
      WelcomeEmail({ username, loginUrl, unsubscribeUrl }),
    );

    const result = await client.messages.create(MAILGUN_DOMAIN, {
      from: FROM_EMAIL,
      to,
      subject: 'Welcome to Bragdoc.ai! 🎉',
      html,
    });

    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};
