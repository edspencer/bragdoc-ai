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
        'Free with your own LLM, optional cloud AI features at $4.99/month',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '1',
    },
  };

  return <SchemaWrapper schema={schema} />;
}
