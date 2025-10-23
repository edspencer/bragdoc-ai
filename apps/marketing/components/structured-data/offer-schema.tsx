import { SchemaWrapper } from './schema-wrapper';

interface Offer {
  name: string;
  price: string;
  priceCurrency: string;
  description: string;
}

interface OfferSchemaProps {
  offers: Offer[];
}

export function OfferSchema({ offers }: OfferSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'BragDoc',
    description: 'AI-powered achievement tracking for developers',
    offers: offers.map((offer) => ({
      '@type': 'Offer',
      name: offer.name,
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      description: offer.description,
      availability: 'https://schema.org/InStock',
    })),
  };

  return <SchemaWrapper schema={schema} />;
}
