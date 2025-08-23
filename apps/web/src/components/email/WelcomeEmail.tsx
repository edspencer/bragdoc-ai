import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  username: string;
  loginUrl: string;
  unsubscribeUrl?: string;
}

export const WelcomeEmail = ({
  username = 'there',
  loginUrl = 'https://bragdoc.ai/login',
  unsubscribeUrl,
}: WelcomeEmailProps) => {
  const previewText = `Welcome to Bragdoc.ai - Start tracking your achievements!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Bragdoc.ai!</Heading>

          <Text style={text}>Hi {username},</Text>

          <Text style={text}>
            We&apos;re excited to have you on board! Bragdoc.ai is your personal
            achievement tracker that helps you document and showcase your
            professional growth.
          </Text>

          <Section style={buttonContainer}>
            <Button
              style={{
                ...button,
                padding: '12px 20px',
              }}
              href={loginUrl}
            >
              Get Started
            </Button>
          </Section>

          <Text style={text}>Here&apos;s what you can do with Bragdoc.ai:</Text>

          <ul>
            <li style={listItem}>Track your daily achievements</li>
            <li style={listItem}>Generate performance review documents</li>
            <li style={listItem}>Sync with GitHub for automatic updates</li>
            <li style={listItem}>Receive weekly achievement summaries</li>
          </ul>

          <Text style={text}>
            Need help getting started? Just reply to this email - we&apos;re
            here to help!
          </Text>

          <Text style={footer}>
            Bragdoc.ai - Your Professional Achievement Tracker
            {unsubscribeUrl && (
              <>
                <br />
                <Link
                  href={unsubscribeUrl}
                  style={{
                    color: '#898989',
                    fontSize: '12px',
                    textDecoration: 'underline',
                  }}
                >
                  Unsubscribe from emails
                </Link>
              </>
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
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
  margin: '24px 0',
};

const button = {
  backgroundColor: '#000000',
  borderRadius: '3px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: '100%',
  textDecoration: 'none',
  textAlign: 'center' as const,
};

const listItem = {
  color: '#1a1a1a',
  fontSize: '14px',
  lineHeight: '24px',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '32px 0 0',
};