import { SchemaWrapper } from './schema-wrapper';

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BragDoc',
    url: 'https://www.bragdoc.ai',
    logo: 'https://www.bragdoc.ai/logo.png',
    description: 'AI-powered achievement tracking for developers',
    sameAs: [
      // Add social media URLs when available
    ],
  };

  return <SchemaWrapper schema={schema} />;
}
