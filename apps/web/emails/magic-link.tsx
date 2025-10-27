import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface MagicLinkEmailProps {
  magicLink: string;
  isNewUser?: boolean;
}

export const MagicLinkEmail = ({
  magicLink,
  isNewUser = false,
}: MagicLinkEmailProps) => {
  const previewText = isNewUser
    ? 'Welcome to BragDoc! Click to complete your registration'
    : 'Sign in to your BragDoc account';

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isNewUser ? 'Welcome to BragDoc!' : 'Sign in to BragDoc'}
          </Heading>

          <Text style={text}>
            {isNewUser
              ? "We're excited to have you on board! Click the button below to complete your registration and start tracking your professional achievements."
              : 'Click the button below to sign in to your account:'}
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={magicLink}>
              {isNewUser ? 'Complete Registration' : 'Sign In'}
            </Button>
          </Section>

          <Text style={text}>
            This link will expire in <strong>24 hours</strong> and can only be
            used once.
          </Text>

          <Text style={text}>
            If you didn't request this email, you can safely ignore it.
          </Text>

          <Text style={footer}>
            BragDoc - Your Professional Achievement Tracker
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles matching BragDoc branding
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
  maxWidth: '100%',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '40px',
  margin: '0 0 20px',
};

const text = {
  color: '#1a1a1a',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const buttonContainer = {
  margin: '32px 0',
};

const button = {
  backgroundColor: '#000000',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '32px 0 0',
};

export default MagicLinkEmail;
