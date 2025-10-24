import Link from 'next/link';

export function PrivacyPolicyContent() {
  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-muted-foreground mb-8">
          <strong>Last Updated:</strong> October 24, 2025
        </p>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            1. Information We Collect
          </h2>
          <p className="mb-4">
            BragDoc collects different types of information depending on how you
            interact with our services:
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">Marketing Website</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              Anonymous session data including page views and button clicks
            </li>
            <li>Device type and browser information</li>
            <li>
              No personally identifiable information is collected without an
              account
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">Web Application</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              Account information: email address, name, and profile picture (if
              provided via OAuth)
            </li>
            <li>Achievement and project data that you create or import</li>
            <li>
              Product usage events to understand feature adoption and usage
              patterns
            </li>
            <li>
              Authentication credentials (passwords are hashed and never stored
              in plain text)
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">Technical Data</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>IP addresses (hashed by our analytics provider, PostHog)</li>
            <li>User agent strings and browser information</li>
            <li>Referrer URLs to understand how you found BragDoc</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            2. How We Use Your Information
          </h2>
          <p className="mb-4">We use the information we collect to:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Provide and improve BragDoc's features and user experience</li>
            <li>
              Understand feature adoption and usage patterns to prioritize
              development
            </li>
            <li>Measure marketing effectiveness and optimize our messaging</li>
            <li>
              Communicate with you about your account, product updates, and
              support inquiries
            </li>
            <li>Process payments and manage subscriptions (via Stripe)</li>
            <li>Detect and prevent fraud, abuse, and security issues</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            3. Analytics & Tracking
          </h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">PostHog Analytics</h3>
          <p className="mb-4">
            We use{' '}
            <Link
              href="https://posthog.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              PostHog
            </Link>{' '}
            for product analytics and user behavior tracking:
          </p>

          <h4 className="text-lg font-semibold mb-2 mt-4">
            Marketing Website:
          </h4>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <strong>Cookieless Mode:</strong> No cookies are stored on your
              device
            </li>
            <li>
              <strong>Session-only tracking:</strong> Data is stored in memory
              and cleared when you close your browser
            </li>
            <li>
              <strong>Anonymous by default:</strong> We cannot identify
              individual users without an account
            </li>
          </ul>

          <h4 className="text-lg font-semibold mb-2 mt-4">Web Application:</h4>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <strong>Persistent tracking after authentication:</strong> Once
              logged in, we track your usage to improve the product
            </li>
            <li>
              <strong>Session cookies for authentication:</strong> Required for
              keeping you logged in
            </li>
            <li>
              <strong>localStorage for preferences:</strong> Stores your theme
              and UI preferences locally
            </li>
          </ul>

          <p className="mb-4">
            For more information about how PostHog handles your data, please
            review their{' '}
            <Link
              href="https://posthog.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              privacy policy
            </Link>
            .
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">4. Data Retention</h2>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <strong>Analytics data:</strong> Retained according to PostHog's
              policy (typically 90 days on free tier)
            </li>
            <li>
              <strong>Account data:</strong> Retained until you delete your
              account
            </li>
            <li>
              <strong>Achievement and project data:</strong> Retained until you
              delete it or close your account
            </li>
            <li>
              <strong>Backups:</strong> May be retained for up to 30 days after
              deletion for disaster recovery purposes
            </li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            5. Third-Party Services
          </h2>
          <p className="mb-4">
            BragDoc uses the following third-party services that may collect or
            process your data:
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">Analytics</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <strong>PostHog:</strong> Product analytics and user behavior
              tracking
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            Infrastructure & Services
          </h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <strong>Cloudflare:</strong> Hosting and CDN services
            </li>
            <li>
              <strong>Neon:</strong> PostgreSQL database hosting
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">Communication</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <strong>Mailgun:</strong> Transactional email delivery
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">Payments</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <strong>Stripe:</strong> Payment processing and subscription
              management
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">Authentication</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <strong>Google:</strong> OAuth authentication provider
            </li>
            <li>
              <strong>GitHub:</strong> OAuth authentication provider
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">AI Services</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <strong>OpenAI:</strong> AI-powered document generation and
              achievement extraction
            </li>
            <li>
              <strong>DeepSeek:</strong> Alternative AI provider for document
              generation
            </li>
            <li>
              <strong>Google Gemini:</strong> Alternative AI provider for
              document generation
            </li>
          </ul>

          <p className="mb-4 mt-4">
            Each of these services has their own privacy policies. We encourage
            you to review them to understand how they handle your data.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            6. Your Rights (GDPR Compliance)
          </h2>
          <p className="mb-4">
            If you are located in the European Economic Area (EEA), you have the
            following data protection rights:
          </p>

          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <strong>Right to Access:</strong> You can request a copy of all
              personal data we hold about you
            </li>
            <li>
              <strong>Right to Rectification:</strong> You can update or correct
              your personal information at any time
            </li>
            <li>
              <strong>Right to Erasure:</strong> You can request deletion of
              your account and all associated data
            </li>
            <li>
              <strong>Right to Data Portability:</strong> You can export your
              achievement and project data in JSON format
            </li>
            <li>
              <strong>Right to Restrict Processing:</strong> You can request we
              limit how we use your data
            </li>
            <li>
              <strong>Right to Object:</strong> You can object to certain types
              of processing
            </li>
            <li>
              <strong>Right to Withdraw Consent:</strong> You can withdraw
              consent for data processing at any time
            </li>
          </ul>

          <p className="mb-4 mt-4">
            To exercise any of these rights, please contact us at{' '}
            <a
              href="mailto:privacy@bragdoc.ai"
              className="text-primary hover:underline"
            >
              privacy@bragdoc.ai
            </a>
            .
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">7. Cookies & Consent</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">Marketing Website</h3>
          <p className="mb-4">
            Our marketing website operates in <strong>cookieless mode</strong>.
            We do not use cookies for tracking or analytics. All analytics data
            is stored in memory and cleared when you close your browser. This
            means:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>No cookie consent banner is required</li>
            <li>No tracking cookies are set</li>
            <li>Analytics data is session-only and anonymous</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">Web Application</h3>
          <p className="mb-4">
            Our web application uses the following cookies and storage
            mechanisms:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <strong>Session cookies:</strong> Essential for authentication and
              keeping you logged in (required)
            </li>
            <li>
              <strong>localStorage:</strong> Stores your theme preference and UI
              settings (optional, can be cleared)
            </li>
            <li>
              <strong>Analytics cookies:</strong> PostHog tracking after
              authentication (used to improve the product)
            </li>
          </ul>

          <p className="mb-4 mt-4">
            By creating an account and using BragDoc, you consent to the use of
            these cookies and storage mechanisms as described.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            8. Contact Information
          </h2>
          <p className="mb-4">
            If you have questions or concerns about this Privacy Policy or how
            we handle your data, please contact us:
          </p>
          <ul className="list-none mb-4 space-y-2">
            <li>
              <strong>Email:</strong>{' '}
              <a
                href="mailto:privacy@bragdoc.ai"
                className="text-primary hover:underline"
              >
                privacy@bragdoc.ai
              </a>
            </li>
            <li>
              <strong>Support:</strong>{' '}
              <a
                href="mailto:support@bragdoc.ai"
                className="text-primary hover:underline"
              >
                support@bragdoc.ai
              </a>
            </li>
          </ul>

          <p className="mb-4 mt-6">
            We will respond to all privacy inquiries within 30 days.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            Changes to This Policy
          </h2>
          <p className="mb-4">
            We may update this Privacy Policy from time to time to reflect
            changes in our practices or for legal, operational, or regulatory
            reasons. We will notify you of any material changes by:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              Posting the updated policy on this page with a new "Last Updated"
              date
            </li>
            <li>
              Sending an email notification if you have an account with us
            </li>
          </ul>
          <p className="mb-4 mt-4">
            Your continued use of BragDoc after changes to this Privacy Policy
            constitutes your acceptance of the updated policy.
          </p>
        </section>
      </div>
    </div>
  );
}
