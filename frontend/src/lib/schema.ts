const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://cornersofa.co.uk';

interface OrganizationSchema {
  '@context': string;
  '@type': string;
  name: string;
  url: string;
  logo: string;
  description: string;
  address: {
    '@type': string;
    addressCountry: string;
    addressRegion: string;
  };
  contactPoint: {
    '@type': string;
    telephone: string;
    contactType: string;
    availableLanguage: string;
  };
}

interface LocalBusinessSchema {
  '@context': string;
  '@type': string;
  name: string;
  url: string;
  address: {
    '@type': string;
    streetAddress: string;
    addressLocality: string;
    postalCode: string;
    addressCountry: string;
  };
  openingHoursSpecification: {
    '@type': string;
    dayOfWeek: string[];
    opens: string;
    closes: string;
  }[];
  telephone: string;
}

interface ProductSchema {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  image: string[];
  brand: { '@type': string; name: string };
  offers: {
    '@type': string;
    url: string;
    priceCurrency: string;
    price: number;
    availability?: string;
  };
  aggregateRating?: {
    '@type': string;
    ratingValue: number;
    reviewCount: number;
  };
}

interface BreadcrumbListSchema {
  '@context': string;
  '@type': string;
  itemListElement: {
    '@type': string;
    position: number;
    name: string;
    item: string;
  }[];
}

interface FAQPageSchema {
  '@context': string;
  '@type': string;
  mainEntity: {
    '@type': string;
    name: string;
    acceptedAnswer: {
      '@type': string;
      text: string;
    };
  }[];
}

export function generateOrganizationSchema(): OrganizationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Corner Sofa',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'Premium UK handmade sofas crafted by skilled artisans. Free delivery, 10-year warranty, and free fabric swatches.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'GB',
      addressRegion: 'England',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+448001234567',
      contactType: 'sales',
      availableLanguage: 'English',
    },
  };
}

export function generateLocalBusinessSchema(): LocalBusinessSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Corner Sofa Showroom',
    url: `${SITE_URL}/appointment`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '42 Deansgate',
      addressLocality: 'Manchester',
      postalCode: 'M3 1NH',
      addressCountry: 'GB',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Sunday'],
        opens: '10:00',
        closes: '16:00',
      },
    ],
    telephone: '+448001234567',
  };
}

export function generateProductSchema(product: {
  title: string;
  description: string;
  images: string[];
  base_price: number;
  id: string;
  rating?: number;
  reviewCount?: number;
  in_stock?: boolean;
  availability_unknown?: boolean;
}): ProductSchema {
  const schema: ProductSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || '',
    image: product.images,
    brand: { '@type': 'Brand', name: 'Corner Sofa' },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/product/${product.id}`,
      priceCurrency: 'GBP',
      price: product.base_price,
      ...(!product.availability_unknown ? { availability: product.in_stock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' } : {}),
    },
  };

  if (product.rating && product.reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    };
  }

  return schema;
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]): BreadcrumbListSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export function generateFAQSchema(faqs: { question: string; answer: string }[]): FAQPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
