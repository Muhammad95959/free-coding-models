/**
 * @file src/routes/changelogs/$.tsx
 * @description Renders one release page. The splat is the release slug (e.g., `v0.5.61` or `0.5.61`).
 * Replicates Kandown's changelog article reader route.
 */

import { createFileRoute, notFound, Link } from '@tanstack/react-router'
import { getAllChangelogs, findEntry } from '~/lib/changelogs'
import { MarkdownRenderer } from '~/components/MarkdownRenderer'
import { Calendar, Tag, ExternalLink } from 'lucide-react'

export const Route = createFileRoute('/changelogs/$')({
  loader: ({ params }) => {
    const slug = params._splat ?? ''
    const all = getAllChangelogs()
    const entry = findEntry(all, slug)
    if (!entry) throw notFound()

    return { slug, entry, all }
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `v${loaderData.entry.version} · ${loaderData.entry.name} · free-coding-models` },
          {
            name: 'description',
            content: `Release notes for free-coding-models v${loaderData.entry.version}.`,
          },
        ]
      : [],
  }),
  component: ChangelogArticlePage,
})

function ChangelogArticlePage() {
  const { entry, all } = Route.useLoaderData()

  // Prev/next follow newest-first ordering (index 0 is newest)
  const index = all.findIndex((item) => item.slug === entry.slug)
  const prev = index > 0 ? all[index - 1] : undefined // Newer release
  const next = index > -1 && index < all.length - 1 ? all[index + 1] : undefined // Older release

  return (
    <article className="min-w-0 py-8 lg:py-12">
      {/* Header */}
      <header className="mb-8 border-b border-border pb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="label text-[11px] font-mono uppercase tracking-wider text-fg-faint">
              Changelog
            </span>
            {entry.date && (
              <span className="font-mono text-xs text-fg-faint flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {entry.date}
              </span>
            )}
          </div>

          <a
            href={`https://github.com/vava-nessa/free-coding-models/releases/tag/${entry.version}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-xs font-mono text-fg-faint hover:text-fg transition-colors"
          >
            GitHub Release <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <h1 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-4xl text-fg leading-tight">
          <span className="font-mono text-accent-fg text-xl sm:text-3xl font-bold mr-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-accent-soft/30 border border-accent/30">
            <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
            v{entry.version}
          </span>
          <span className="text-fg">{entry.name}</span>
        </h1>
      </header>

      {/* Markdown Content Article Body */}
      <div className="prose max-w-none">
        <MarkdownRenderer content={entry.content} />
      </div>

      {/* Footer Prev / Next Navigation */}
      <nav className="mt-14 grid gap-4 border-t border-border pt-6 sm:grid-cols-2 font-mono">
        {prev ? (
          <Link
            to="/changelogs/$"
            params={{ _splat: prev.slug }}
            className="group border border-border bg-bg-subtle/50 p-4 rounded-xl transition-all hover:border-border-strong hover:bg-bg-subtle"
          >
            <span className="label text-[10px] text-fg-faint block mb-1">← Newer Release</span>
            <span className="block text-xs font-semibold text-fg-muted group-hover:text-accent-fg transition-colors truncate">
              v{prev.version} · {prev.name}
            </span>
          </Link>
        ) : (
          <span />
        )}

        {next && (
          <Link
            to="/changelogs/$"
            params={{ _splat: next.slug }}
            className="group border border-border bg-bg-subtle/50 p-4 rounded-xl text-right transition-all hover:border-border-strong hover:bg-bg-subtle sm:col-start-2"
          >
            <span className="label text-[10px] text-fg-faint block mb-1">Older Release →</span>
            <span className="block text-xs font-semibold text-fg-muted group-hover:text-accent-fg transition-colors truncate">
              v{next.version} · {next.name}
            </span>
          </Link>
        )}
      </nav>
    </article>
  )
}
