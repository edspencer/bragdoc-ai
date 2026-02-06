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
      price: '45',
      priceCurrency: 'USD',
      description:
        'Free trial credits included. Full access at $45/year or $99 lifetime.',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '1',
    },
  };

  return <SchemaWrapper schema={schema} />;
}
