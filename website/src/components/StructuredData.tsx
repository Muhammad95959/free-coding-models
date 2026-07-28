/**
 * @file src/components/StructuredData.tsx
 * @description JSON-LD structured data schemas for SEO.
 */
import { site } from '~/lib/site'

export function HomeStructuredData() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    description: site.description,
    url: site.url,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cross-platform (macOS, Linux, Windows, Docker)',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: site.author,
      url: site.authorUrl,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
