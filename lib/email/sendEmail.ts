import { render } from '@react-email/render';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { WelcomeEmail } from './templates/WelcomeEmail';
import type { ComponentProps } from 'react';
import type { EmailType } from './types';
import { generateUnsubscribeUrl, isUnsubscribed } from './unsubscribe';

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
  userId: string;
  emailType?: EmailType;
}

export const sendEmail = async ({ to, subject, html, text, userId, emailType }: SendEmailOptions) => {
  // Check if user is unsubscribed
  if (await isUnsubscribed(userId, emailType)) {
    console.log(`Skipping email to ${to} - user has unsubscribed`);
    return { success: false, reason: 'unsubscribed' };
  }

  try {
    // Generate unsubscribe URL
    const unsubscribeUrl = await generateUnsubscribeUrl(userId, emailType);
    
    // Add unsubscribe header
    const result = await client.messages.create(MAILGUN_DOMAIN, {
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
      'h:List-Unsubscribe': `<${unsubscribeUrl}>`,
    });
    
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

type WelcomeEmailProps = ComponentProps<typeof WelcomeEmail>;

interface SendWelcomeEmailParams extends Omit<WelcomeEmailProps, 'preview' | 'unsubscribeUrl'> {
  to: string;
  userId: string;
}

// Shared function to render welcome email template
export const renderWelcomeEmail = async (props: WelcomeEmailProps): Promise<string> => {
  return render(WelcomeEmail(props));
};

export const sendWelcomeEmail = async ({
  to,
  userId,
  username,
  loginUrl,
}: SendWelcomeEmailParams) => {
  const unsubscribeUrl = await generateUnsubscribeUrl(userId, 'welcome');
  const html = await renderWelcomeEmail({ username, loginUrl, unsubscribeUrl });
  
  return sendEmail({
    to,
    userId,
    emailType: 'welcome',
    subject: 'Welcome to Bragdoc.ai! 🎉',
    html,
  });
};
