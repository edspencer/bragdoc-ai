import { OrganizationSchema } from '@/components/structured-data/organization-schema';
import { SoftwareApplicationSchema } from '@/components/structured-data/software-application-schema';
import { FAQSchema } from '@/components/structured-data/faq-schema';
import { BlogPostingSchema } from '@/components/structured-data/blog-posting-schema';
import { HowToSchema } from '@/components/structured-data/how-to-schema';
import { OfferSchema } from '@/components/structured-data/offer-schema';

export default function SchemaTestPage() {
  const testFaqs = [{ question: 'Test question?', answer: 'Test answer.' }];
  const testSteps = [{ name: 'Step 1', text: 'Do something' }];
  const testOffers = [
    {
      name: 'Test Plan',
      price: '0',
      priceCurrency: 'USD',
      description: 'Test',
    },
  ];
  const testPost = {
    title: 'Test Blog Post',
    description: 'Test description',
    date: '2025-01-01',
    slug: 'test-post',
    author: 'Test Author',
    content: '',
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-4">Schema Markup Test Page</h1>
      <p className="mb-8">View page source to inspect all schema types</p>

      <OrganizationSchema />
      <SoftwareApplicationSchema />
      <FAQSchema faqs={testFaqs} />
      <BlogPostingSchema post={testPost} />
      <HowToSchema
        name="Test HowTo"
        description="Test description"
        steps={testSteps}
      />
      <OfferSchema offers={testOffers} />

      <div className="mt-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Testing Instructions:</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>View page source (Cmd/Ctrl + U)</li>
          <li>Search for &quot;application/ld+json&quot;</li>
          <li>Copy each schema block</li>
          <li>
            Test at{' '}
            <a
              href="https://search.google.com/test/rich-results"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              https://search.google.com/test/rich-results
            </a>
          </li>
          <li>Verify no errors or warnings</li>
        </ol>
      </div>

      <div className="mt-8 p-6 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
        <h2 className="text-xl font-bold mb-2">⚠️ Important:</h2>
        <p>
          This page is for development and testing only. Remove or protect this
          page before production deployment.
        </p>
      </div>
    </div>
  );
}
