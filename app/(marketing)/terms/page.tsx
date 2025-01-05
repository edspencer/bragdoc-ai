import { Container } from '@/components/marketing/salient/Container';

export const metadata = {
  title: 'Terms of Service - bragdoc.ai',
  description: 'Terms and conditions for using bragdoc.ai services.',
};

export default function TermsPage() {
  return (
    <Container className="relative">
      <div className="mx-auto max-w-3xl pt-16 pb-24">
        <h1 className="font-display text-4xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-5xl mb-8">
          Terms of Service
        </h1>

        <div className="prose dark:prose-invert">
          <p className="lead">Last updated: December 16, 2024</p>

          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using bragdoc.ai (&quot;the Service&quot;), you
            agree to be bound by these Terms of Service and all applicable laws
            and regulations. If you do not agree with any of these terms, you
            are prohibited from using the Service.
          </p>

          <h2>2. Use License</h2>
          <p>
            We grant you a personal, non-transferable, non-exclusive license to
            use the Service subject to these Terms. This license is conditioned
            on your compliance with our usage guidelines and subscription terms.
          </p>

          <h3>2.1 Basic Account</h3>
          <p>The basic account includes:</p>
          <ul>
            <li>Basic usage limits on achievements and documents</li>
            <li>Core achievement tracking features</li>
            <li>Document generation capabilities</li>
          </ul>

          <h3>2.2 Paid Subscriptions</h3>
          <p>Paid subscriptions provide additional features including:</p>
          <ul>
            <li>GitHub repository integration</li>
            <li>Unlimited achievements and documents</li>
            <li>Advanced publishing options</li>
            <li>Scheduled updates</li>
          </ul>

          <h2>3. GitHub Integration</h2>
          <p>When using our GitHub integration features:</p>
          <ul>
            <li>You must comply with GitHub&apos;s terms of service</li>
            <li>
              You are responsible for managing repository access permissions
            </li>
            <li>
              We are not responsible for any unintended data exposure due to
              incorrect permission settings
            </li>
          </ul>

          <h2>4. User Content</h2>
          <p>
            You retain all rights to your content. By using the Service, you
            grant us a license to:
          </p>
          <ul>
            <li>Store and process your content to provide the Service</li>
            <li>Generate summaries and reports based on your content</li>
            <li>Analyze usage patterns to improve the Service</li>
          </ul>

          <h2>5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose</li>
            <li>Share confidential information without proper authorization</li>
            <li>
              Attempt to bypass any service limitations or security measures
            </li>
            <li>Reverse engineer or attempt to extract our source code</li>
          </ul>

          <h2>6. Payment Terms</h2>
          <p>For paid subscriptions:</p>
          <ul>
            <li>
              Payments are processed securely through our payment provider
            </li>
            <li>Subscriptions auto-renew unless cancelled</li>
            <li>Refunds are handled on a case-by-case basis</li>
            <li>Prices may change with notice to subscribers</li>
          </ul>

          <h2>7. Termination</h2>
          <p>
            We may terminate or suspend your account if you violate these Terms.
            Upon termination:
          </p>
          <ul>
            <li>You lose access to premium features</li>
            <li>You can export your data within 30 days</li>
            <li>We may retain certain data as required by law</li>
          </ul>

          <h2>8. Service Availability</h2>
          <p>While we strive for high availability:</p>
          <ul>
            <li>We do not guarantee uninterrupted service</li>
            <li>We may perform maintenance with notice</li>
            <li>We are not liable for service interruptions</li>
          </ul>

          <h2>9. Limitation of Liability</h2>
          <p>
            We provide the Service &quot;as is&quot; without warranties. We are
            not liable for:
          </p>
          <ul>
            <li>Data loss or corruption</li>
            <li>Service interruptions</li>
            <li>Indirect or consequential damages</li>
            <li>Third-party actions or content</li>
          </ul>

          <h2>10. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. We will notify users of
            significant changes via:
          </p>
          <ul>
            <li>Email notification</li>
            <li>Service announcement</li>
            <li>Updated &quot;Last updated&quot; date</li>
          </ul>

          <h2>11. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction in which
            bragdoc.ai operates, without regard to its conflict of law
            provisions.
          </p>

          <h2>12. Contact Information</h2>
          <p>For questions about these Terms, please contact us at:</p>
          <ul>
            <li>Email: legal@bragdoc.ai</li>
          </ul>
        </div>
      </div>
    </Container>
  );
}
