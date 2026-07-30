/**
 * @file src/routes/docs/$.tsx
 * @description Splat route for rendering documentation pages.
 */
import { createFileRoute, notFound, Link, redirect } from '@tanstack/react-router'
import { MDXProvider } from '@mdx-js/react'
import { getDoc } from '~/lib/docs'
import { flatDocs } from '~/content/nav'
import { mdxComponents } from '~/components/MdxComponents'
import { CopyPageButton } from '~/components/CopyPageButton'
import { site } from '~/lib/site'

const ARTICLE_ID = 'doc-article'

export const Route = createFileRoute('/docs/$')({
  loader: ({ params }) => {
    const slug = params._splat ?? 'introduction'
    // 📖 Slug redirects: when pages are renamed, keep the old URL alive so external
    // links don't 404. (The old MDX file is deleted; this redirect is the bridge.)
    const SLUG_REDIRECTS: Record<string, string> = {
      'integrations/pi-extension': 'integrations/pi',
    }
    if (SLUG_REDIRECTS[slug]) {
      throw redirect({ to: '/docs/$', params: { _splat: SLUG_REDIRECTS[slug] } })
    }
    const doc = getDoc(slug)
    if (!doc) throw notFound()
    return { slug, frontmatter: doc.frontmatter }
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.frontmatter.title} — free-coding-models docs` },
          ...(loaderData.frontmatter.description
            ? [{ name: 'description', content: loaderData.frontmatter.description }]
            : []),
        ]
      : [],
  }),
  component: DocPage,
})

function DocPage() {
  const { slug, frontmatter } = Route.useLoaderData()
  const doc = getDoc(slug)
  if (!doc) return null
  const { Content } = doc

  const index = flatDocs.findIndex((item) => item.slug === slug)
  const prev = index > 0 ? flatDocs[index - 1] : undefined
  const next = index > -1 ? flatDocs[index + 1] : undefined

  const editUrl = `${site.repo}/edit/main/website/src/content/docs/${slug}.mdx`

  return (
    <article className="min-w-0 py-10 lg:py-16">
        <header className="mb-9 border-b border-border pb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="label">{frontmatter.section ?? 'Docs'}</p>
            <CopyPageButton slug={slug} />
          </div>
          <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-balance sm:text-4xl text-fg">
            {frontmatter.title}
          </h1>
          {frontmatter.description && (
            <p className="mt-4 max-w-2xl font-mono text-sm leading-relaxed text-fg-muted">
              {frontmatter.description}
            </p>
          )}
        </header>

        <div id={ARTICLE_ID} className="prose">
          <MDXProvider components={mdxComponents}>
            <Content />
          </MDXProvider>
        </div>

        <nav className="mt-16 grid gap-3 border-t border-border pt-6 sm:grid-cols-2 font-mono">
          {prev ? (
            <Link
              to="/docs/$"
              params={{ _splat: prev.slug }}
              className="group border border-border p-4 rounded-lg transition-colors hover:border-border-strong"
            >
              <span className="label">Previous</span>
              <span className="mt-1 block text-xs font-medium text-fg-muted transition-colors group-hover:text-fg">
                ← {prev.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to="/docs/$"
              params={{ _splat: next.slug }}
              className="group border border-border p-4 rounded-lg text-right transition-colors hover:border-border-strong sm:col-start-2"
            >
              <span className="label">Next</span>
              <span className="mt-1 block text-xs font-medium text-fg-muted transition-colors group-hover:text-fg">
                {next.title} →
              </span>
            </Link>
          )}
        </nav>

        <p className="mt-8 text-xs font-mono">
          <a
            href={editUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="label transition-colors hover:text-fg"
          >
            Edit this page on GitHub →
          </a>
        </p>
      </article>
  )
}
