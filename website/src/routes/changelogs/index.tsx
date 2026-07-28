/**
 * @file src/routes/changelogs/index.tsx
 * @description `/changelogs` index route: redirects to the latest release so the URL always points to a real release.
 * Replicates Kandown's index loader redirect behavior.
 */

import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { getAllChangelogs } from '~/lib/changelogs'

export const Route = createFileRoute('/changelogs/')({
  loader: () => {
    const entries = getAllChangelogs()
    const latest = entries[0]
    if (latest) {
      throw redirect({ to: '/changelogs/$', params: { _splat: latest.slug } })
    }
    return { entries }
  },
  head: () => ({
    meta: [
      { title: 'Changelogs & Release Notes — free-coding-models' },
      {
        name: 'description',
        content: 'Full release notes for free-coding-models.',
      },
    ],
  }),
  component: ChangelogIndexFallback,
})

function ChangelogIndexFallback() {
  return (
    <article className="py-10 lg:py-16">
      <p className="label mb-3">Releases</p>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl text-fg">
        Changelog
      </h1>
      <p className="mt-4 max-w-2xl text-sm text-fg-muted font-mono">
        No releases published yet.
      </p>
      <p className="mt-8 text-xs font-mono">
        <Link to="/docs/$" params={{ _splat: 'introduction' }} className="text-accent-fg underline underline-offset-4 hover:text-fg">
          Read documentation →
        </Link>
      </p>
    </article>
  )
}
