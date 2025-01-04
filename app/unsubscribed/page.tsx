import { Container } from '@/components/marketing/salient/Container';
import {
  verifyUnsubscribeToken,
  unsubscribeUser,
} from '@/lib/email/unsubscribe';

export default async function UnsubscribedPage({
  searchParams,
}: {
  searchParams: { token?: string; salt?: string };
}) {
  const token = searchParams.token;
  const salt = searchParams.salt;

  if (!token || !salt) {
    return (
      <Container>
        <h1>Invalid Unsubscribe Link</h1>
        <p>
          This unsubscribe link appears to be invalid. Please try again or
          contact support.
        </p>
      </Container>
    );
  }

  try {
    const data = await verifyUnsubscribeToken(token, salt);
    await unsubscribeUser(data.userId, data.emailType);

    return (
      <Container>
        <h1>Successfully Unsubscribed</h1>
        <p>
          You have been unsubscribed from{' '}
          {data.emailType ? `${data.emailType} emails` : 'all emails'}.
        </p>
      </Container>
    );
  } catch (error) {
    return (
      <Container>
        <h1>Invalid or Expired Link</h1>
        <p>
          This unsubscribe link appears to be invalid or has expired. Please try
          again or contact support.
        </p>
      </Container>
    );
  }
}
