import { render } from '@react-email/render';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { WelcomeEmail } from './templates/WelcomeEmail';
import type { ComponentProps } from 'react';

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY!;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN!;
const FROM_EMAIL = 'hello@bragdoc.ai';

// Initialize Mailgun
const mailgun = new Mailgun(formData);
const client = mailgun.client({ username: 'api', key: MAILGUN_API_KEY });

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions) => {
  try {
    const result = await client.messages.create(MAILGUN_DOMAIN, {
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

type WelcomeEmailProps = ComponentProps<typeof WelcomeEmail>;

interface SendWelcomeEmailParams extends Omit<WelcomeEmailProps, 'preview'> {
  to: string;
}

// Shared function to render welcome email template
export const renderWelcomeEmail = async (props: WelcomeEmailProps): Promise<string> => {
  return render(WelcomeEmail(props));
};

export const sendWelcomeEmail = async ({
  to,
  username,
  loginUrl,
}: SendWelcomeEmailParams) => {
  const html = await renderWelcomeEmail({ username, loginUrl });
  
  return sendEmail({
    to,
    subject: 'Welcome to Bragdoc.ai! 🎉',
    html,
  });
};
