import { SchemaWrapper } from './schema-wrapper';

export function SoftwareApplicationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BragDoc',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web, macOS, Linux, Windows',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description:
        'Completely free — use the hosted app with your own LLM API key, or self-host it yourself',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '1',
    },
  };

  return <SchemaWrapper schema={schema} />;
}
