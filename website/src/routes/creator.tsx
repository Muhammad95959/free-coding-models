/**
 * @file src/routes/creator.tsx
 * @description Concise creator profile connecting Vanessa Depraute's professional
 * identity with free-coding-models and her verified public profiles.
 * @exports Route
 */
import { createFileRoute } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { CreatorStructuredData } from '~/components/StructuredData'
import { site } from '~/lib/site'

export const Route = createFileRoute('/creator')({
  head: () => ({
    meta: [
      { title: `Vanessa Depraute — Creator of ${site.name}` },
      {
        name: 'description',
        content:
          'Meet Vanessa Depraute, the Senior Full-Stack JavaScript Developer and open-source creator behind free-coding-models.',
      },
    ],
    links: [{ rel: 'canonical', href: site.authorProfileUrl }],
  }),
  component: CreatorPage,
})

const PROFILE_LINKS = [
  { label: 'Portfolio', href: site.authorUrl },
  { label: 'GitHub', href: site.github },
  { label: 'LinkedIn', href: site.linkedin },
  { label: 'X · @vavanessadev', href: site.twitter },
] as const

function CreatorPage() {
  return (
    <>
      <CreatorStructuredData />
      <article className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="label text-accent-fg">Creator &amp; maintainer</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-fg sm:text-6xl">
          Vanessa Depraute
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
          I&apos;m a Paris-based Senior Full-Stack JavaScript Developer with almost
          20 years of experience building web and mobile products. I created and
          maintain <strong className="font-semibold text-fg">free-coding-models</strong>,
          and I specialize in React, TypeScript, AI developer tooling, and turning
          complex ideas into production-ready applications.
        </p>

        <nav aria-label="Vanessa Depraute profiles" className="mt-10 flex flex-wrap gap-3">
          {PROFILE_LINKS.map((profile) => (
            <a
              key={profile.href}
              href={profile.href}
              target="_blank"
              rel="me noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-raised px-4 py-2.5 font-mono text-xs font-medium text-fg transition-colors hover:border-border-strong hover:bg-bg-subtle"
            >
              {profile.label}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ))}
        </nav>
      </article>
    </>
  )
}
