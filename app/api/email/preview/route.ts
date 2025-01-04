import { NextRequest } from 'next/server';
import { renderWelcomeEmail } from '@/lib/email/sendEmail';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const username = searchParams.get('username') || 'User';
  
  const html = await renderWelcomeEmail({
    username,
    loginUrl: 'https://bragdoc.ai/login',
  });

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
