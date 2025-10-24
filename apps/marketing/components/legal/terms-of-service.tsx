import Link from 'next/link';

export function TermsOfServiceContent() {
  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-muted-foreground mb-8">
          <strong>Last Updated:</strong> October 24, 2025
        </p>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="mb-4">
            By accessing or using BragDoc ("the Service"), you agree to be bound
            by these Terms of Service ("Terms"). If you do not agree to these
            Terms, you may not access or use the Service.
          </p>
          <p className="mb-4">
            You must be at least 18 years of age to use this Service. If you are
            under 18, you may only use the Service with the consent and
            supervision of a parent or legal guardian who agrees to be bound by
            these Terms.
          </p>
          <p className="mb-4">
            By creating an account, you represent and warrant that:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              You are at least 18 years old or have parental/guardian consent
            </li>
            <li>You have the legal capacity to enter into these Terms</li>
            <li>All information you provide is accurate and truthful</li>
            <li>You will comply with these Terms and all applicable laws</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            2. Service Description
          </h2>
          <p className="mb-4">
            BragDoc is a professional achievement tracking platform that helps
            you:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Track and document your professional accomplishments</li>
            <li>
              Extract achievements automatically from Git commits via our CLI
              tool
            </li>
            <li>
              Generate AI-powered documents for performance reviews, resumes,
              and more
            </li>
            <li>
              Organize achievements by projects, companies, and time periods
            </li>
            <li>Export your data at any time</li>
          </ul>

          <p className="mb-4 mt-6">
            <strong>Beta/Early-Stage Product Disclaimer:</strong> BragDoc is
            currently in active development. While we strive to provide a stable
            and reliable service, you acknowledge that:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              Features may change, be added, or removed without prior notice
            </li>
            <li>
              The Service may experience downtime, bugs, or data inconsistencies
            </li>
            <li>We recommend backing up important data regularly</li>
            <li>
              AI-generated content should be reviewed and edited before use
            </li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            3. User Responsibilities
          </h2>
          <p className="mb-4">As a user of BragDoc, you agree to:</p>

          <h3 className="text-xl font-semibold mb-3 mt-6">Account Security</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              Maintain the security and confidentiality of your account
              credentials
            </li>
            <li>
              Notify us immediately of any unauthorized access to your account
            </li>
            <li>Use a strong, unique password for your account</li>
            <li>
              Accept responsibility for all activities that occur under your
              account
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            Accurate Information
          </h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              Provide accurate and current information when creating your
              account
            </li>
            <li>Update your account information to keep it accurate</li>
            <li>Not impersonate others or provide false information</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">Acceptable Use</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Use the Service only for lawful purposes</li>
            <li>Not interfere with or disrupt the Service or servers</li>
            <li>
              Not attempt to gain unauthorized access to any part of the Service
            </li>
            <li>
              Not use the Service to store or distribute malicious software
            </li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">4. Prohibited Uses</h2>
          <p className="mb-4">You may not use BragDoc to:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Violate any local, state, national, or international law</li>
            <li>
              Upload or share content that is illegal, harmful, threatening,
              abusive, harassing, defamatory, vulgar, obscene, or otherwise
              objectionable
            </li>
            <li>Infringe upon the intellectual property rights of others</li>
            <li>Transmit viruses, malware, or other malicious code</li>
            <li>
              Attempt to reverse engineer, decompile, or disassemble the Service
            </li>
            <li>
              Use automated scripts, bots, or scrapers to access the Service
              without permission
            </li>
            <li>
              Resell, redistribute, or commercially exploit the Service without
              authorization
            </li>
            <li>
              Interfere with or disrupt other users' access to the Service
            </li>
            <li>Collect or harvest personal information about other users</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            5. Intellectual Property
          </h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            BragDoc's Property
          </h3>
          <p className="mb-4">
            BragDoc and its original content, features, and functionality are
            owned by BragDoc and are protected by international copyright,
            trademark, patent, trade secret, and other intellectual property
            laws. This includes:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>The BragDoc platform, software, and code</li>
            <li>The BragDoc name, logo, and branding</li>
            <li>All documentation, designs, and interfaces</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">Your Data</h3>
          <p className="mb-4">
            You retain all rights to the data you create, upload, or store in
            BragDoc, including:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Your achievement descriptions and project data</li>
            <li>Any documents you generate using the Service</li>
            <li>Any content you upload or create within the platform</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">License Grant</h3>
          <p className="mb-4">
            By using BragDoc, you grant us a limited, non-exclusive, worldwide
            license to:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Store and process your data to provide the Service</li>
            <li>
              Use your data to generate AI-powered documents on your behalf
            </li>
            <li>Make backups of your data for disaster recovery purposes</li>
            <li>
              Analyze aggregated, anonymized usage data to improve the Service
            </li>
          </ul>
          <p className="mb-4 mt-4">
            This license terminates when you delete your account or remove
            specific content from the Service.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            6. Account Termination
          </h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            Termination by You
          </h3>
          <p className="mb-4">You may terminate your account at any time by:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Using the account deletion feature in your settings</li>
            <li>Contacting our support team at support@bragdoc.ai</li>
          </ul>
          <p className="mb-4 mt-4">
            Upon account deletion, your data will be permanently removed from
            our systems within 30 days, except as required by law or for
            legitimate business purposes (e.g., resolving disputes, preventing
            fraud).
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            Termination by BragDoc
          </h3>
          <p className="mb-4">
            We reserve the right to suspend or terminate your account at any
            time, with or without notice, for:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Violation of these Terms of Service</li>
            <li>Fraudulent, abusive, or illegal activity</li>
            <li>Extended periods of inactivity (we will notify you first)</li>
            <li>Requests by law enforcement or government agencies</li>
            <li>Technical or security reasons</li>
          </ul>
          <p className="mb-4 mt-4">
            If we terminate your account for violations, you may not be entitled
            to a refund of any subscription fees.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            7. Liability & Disclaimers
          </h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            "As Is" Disclaimer
          </h3>
          <p className="mb-4">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
            WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT
            LIMITED TO:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              Warranties of merchantability, fitness for a particular purpose,
              or non-infringement
            </li>
            <li>
              Warranties that the Service will be uninterrupted, secure, or
              error-free
            </li>
            <li>
              Warranties regarding the accuracy, completeness, or reliability of
              any content or data
            </li>
            <li>Warranties that defects will be corrected</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            Limitation of Liability
          </h3>
          <p className="mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, BRAGDOC SHALL NOT BE LIABLE
            FOR:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              Any indirect, incidental, special, consequential, or punitive
              damages
            </li>
            <li>
              Loss of profits, data, use, goodwill, or other intangible losses
            </li>
            <li>
              Damages resulting from your access to or inability to access the
              Service
            </li>
            <li>
              Damages resulting from any conduct or content of third parties
            </li>
            <li>Unauthorized access to or alteration of your data</li>
          </ul>
          <p className="mb-4 mt-4">
            OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO
            THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE
            (12) MONTHS PRIOR TO THE CLAIM, OR $100, WHICHEVER IS GREATER.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            AI-Generated Content Disclaimer
          </h3>
          <p className="mb-4">
            AI-generated documents and content are provided as suggestions only.
            You are responsible for:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Reviewing and verifying all AI-generated content before use</li>
            <li>
              Ensuring accuracy and appropriateness for your intended purpose
            </li>
            <li>
              Not relying solely on AI-generated content for important decisions
            </li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">8. Payment Terms</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            Subscription Pricing
          </h3>
          <p className="mb-4">
            BragDoc offers both free and paid subscription plans. Current
            pricing and plan details are available on our{' '}
            <Link href="/pricing" className="text-primary hover:underline">
              pricing page
            </Link>
            .
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">Billing</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              Subscription fees are billed in advance on a monthly or annual
              basis
            </li>
            <li>All fees are in USD unless otherwise stated</li>
            <li>
              You authorize us to charge your payment method for all fees
              incurred
            </li>
            <li>Prices are subject to change with 30 days' notice</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">Refund Policy</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              We offer a 14-day money-back guarantee for new subscriptions
            </li>
            <li>Refunds after 14 days are at our discretion</li>
            <li>To request a refund, contact support@bragdoc.ai</li>
            <li>Refunds are processed within 5-10 business days</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">Cancellation</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              You may cancel your subscription at any time from your account
              settings
            </li>
            <li>
              Cancellation takes effect at the end of your current billing
              period
            </li>
            <li>
              You will retain access to paid features until the end of the paid
              period
            </li>
            <li>No refunds are provided for partial months or unused time</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">9. Dispute Resolution</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">Governing Law</h3>
          <p className="mb-4">
            These Terms shall be governed by and construed in accordance with
            the laws of the State of Delaware, United States, without regard to
            its conflict of law provisions.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            Dispute Resolution Process
          </h3>
          <p className="mb-4">
            In the event of any dispute, controversy, or claim arising out of or
            relating to these Terms or the Service:
          </p>
          <ol className="list-decimal pl-6 mb-4 space-y-2">
            <li>
              You agree to first contact us at support@bragdoc.ai to attempt to
              resolve the dispute informally
            </li>
            <li>
              If the dispute cannot be resolved within 30 days, either party may
              initiate binding arbitration
            </li>
            <li>
              Arbitration shall be conducted by a single arbitrator in
              accordance with the rules of the American Arbitration Association
            </li>
            <li>
              The arbitration shall take place in Delaware, or remotely via
              video conference
            </li>
            <li>Each party shall bear its own costs and fees</li>
          </ol>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            Class Action Waiver
          </h3>
          <p className="mb-4">
            YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED
            ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR
            REPRESENTATIVE ACTION.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            10. Contact Information
          </h2>
          <p className="mb-4">
            If you have questions or concerns about these Terms of Service,
            please contact us:
          </p>
          <ul className="list-none mb-4 space-y-2">
            <li>
              <strong>Email:</strong>{' '}
              <a
                href="mailto:support@bragdoc.ai"
                className="text-primary hover:underline"
              >
                support@bragdoc.ai
              </a>
            </li>
            <li>
              <strong>Legal:</strong>{' '}
              <a
                href="mailto:legal@bragdoc.ai"
                className="text-primary hover:underline"
              >
                legal@bragdoc.ai
              </a>
            </li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            Changes to These Terms
          </h2>
          <p className="mb-4">
            We reserve the right to modify these Terms at any time. If we make
            material changes, we will notify you by:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              Posting the updated Terms on this page with a new "Last Updated"
              date
            </li>
            <li>
              Sending an email notification to your registered email address
            </li>
            <li>Displaying a prominent notice within the Service</li>
          </ul>
          <p className="mb-4 mt-4">
            Your continued use of the Service after changes to these Terms
            constitutes your acceptance of the updated Terms. If you do not
            agree to the updated Terms, you must stop using the Service and may
            delete your account.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Miscellaneous</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">Entire Agreement</h3>
          <p className="mb-4">
            These Terms, together with our{' '}
            <Link
              href="/privacy-policy"
              className="text-primary hover:underline"
            >
              Privacy Policy
            </Link>
            , constitute the entire agreement between you and BragDoc regarding
            the Service.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">Severability</h3>
          <p className="mb-4">
            If any provision of these Terms is found to be unenforceable or
            invalid, that provision will be limited or eliminated to the minimum
            extent necessary, and the remaining provisions will remain in full
            force and effect.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">Waiver</h3>
          <p className="mb-4">
            No waiver of any term of these Terms shall be deemed a further or
            continuing waiver of such term or any other term.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">Assignment</h3>
          <p className="mb-4">
            You may not assign or transfer these Terms or your rights hereunder
            without our prior written consent. We may assign these Terms without
            restriction.
          </p>
        </section>
      </div>
    </div>
  );
}
