/**
 * @file src/components/StructuredData.tsx
 * @description JSON-LD structured data schemas for SEO.
 */
import { site } from '~/lib/site'

const personSchema = {
  '@type': 'Person',
  '@id': `${site.authorUrl}/#person`,
  name: site.author,
  alternateName: ['Vava-Nessa', 'vava-nessa', '@vavanessadev'],
  url: site.authorUrl,
  jobTitle: 'Senior Full-Stack JavaScript Developer',
  sameAs: [site.github, site.linkedin, site.twitter],
}

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
    author: personSchema,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function CreatorStructuredData() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${site.author} — Creator of ${site.name}`,
    url: site.authorProfileUrl,
    mainEntity: personSchema,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
