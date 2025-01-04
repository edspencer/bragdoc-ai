import { Container } from '@/components/marketing/salient/Container';

export const metadata = {
  title: 'Privacy Policy - bragdoc.ai',
  description: 'Our commitment to protecting your privacy and data.',
};

export default function PrivacyPage() {
  return (
    <Container className="relative">
      <div className="mx-auto max-w-3xl pt-16 pb-24">
        <h1 className="font-display text-4xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-5xl mb-8">
          Privacy Policy
        </h1>

        <div className="prose dark:prose-invert">
          <p className="lead">Last updated: December 16, 2024</p>

          <h2>Introduction</h2>
          <p>
            At bragdoc.ai, we take your privacy seriously. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your
            information when you use our service.
          </p>

          <h2>Information We Collect</h2>
          <h3>Account Information</h3>
          <p>When you create an account, we collect:</p>
          <ul>
            <li>Email address</li>
            <li>Name</li>
            <li>Profile picture (if provided)</li>
            <li>Authentication provider information (Google or GitHub)</li>
          </ul>

          <h3>GitHub Integration Data</h3>
          <p>If you choose to connect your GitHub account, we collect:</p>
          <ul>
            <li>GitHub access token</li>
            <li>Repository information</li>
            <li>Pull request data</li>
            <li>Commit messages</li>
          </ul>

          <h3>Achievement Data</h3>
          <p>As you use bragdoc.ai, we collect:</p>
          <ul>
            <li>Achievement descriptions and metadata</li>
            <li>Generated documents and summaries</li>
            <li>Chat messages and interactions</li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain our service</li>
            <li>Generate achievement summaries and reports</li>
            <li>Improve and personalize your experience</li>
            <li>Communicate with you about service updates</li>
            <li>Ensure the security of your account</li>
          </ul>

          <h2>Data Storage and Security</h2>
          <p>
            Your data is stored securely in our database hosted on Vercel&apos;s
            infrastructure. We implement appropriate technical and
            organizational measures to protect your information against
            unauthorized access, alteration, disclosure, or destruction.
          </p>

          <h2>Data Sharing</h2>
          <p>
            We do not sell your personal information. We may share your
            information only in the following circumstances:
          </p>
          <ul>
            <li>With your explicit consent</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights, privacy, safety, or property</li>
          </ul>

          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data</li>
            <li>Opt-out of marketing communications</li>
          </ul>

          <h2>Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul>
            <li>GitHub (for repository integration)</li>
            <li>Google (for authentication)</li>
            <li>Vercel (for hosting and infrastructure)</li>
            <li>OpenAI (for AI-powered features)</li>
          </ul>

          <h2>Cookie Policy</h2>
          <p>
            We use essential cookies to maintain your session and preferences.
            We also use analytics cookies to understand how you use our service
            and improve it.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page
            and updating the &quot;Last updated&quot; date.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact
            us at:
          </p>
          <ul>
            <li>Email: privacy@bragdoc.ai</li>
          </ul>
        </div>
      </div>
    </Container>
  );
}
