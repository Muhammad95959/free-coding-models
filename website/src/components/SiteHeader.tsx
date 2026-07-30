/**
 * @file src/components/SiteHeader.tsx
 * @description The sticky top bar shared by every page: wordmark, primary nav,
 * a docs search trigger, and GitHub / npm links.
 *
 * 📖 Dark-mode translucent sticky header with responsive mobile collapse.
 */
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Wordmark } from './Logo'
import { SearchTrigger } from './DocSearch'
import { GitHubStars } from './GitHubStars'
import { NpmDownloads } from './NpmDownloads'
import { site } from '~/lib/site'

const NAV = [
  { slug: 'introduction', label: 'Docs' },
  { to: '/changelogs', label: 'Changelogs' },
] as const

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border transition-colors duration-200 ${
        scrolled ? 'bg-bg/85 backdrop-blur-xl' : 'bg-bg'
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-7 px-5 sm:px-8">
        <Link to="/" className="shrink-0" aria-label="free-coding-models home">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link
              key={'slug' in item ? item.slug : item.to}
              to={'slug' in item ? '/docs/$' : item.to}
              params={'slug' in item ? { _splat: item.slug } : undefined}
              className="label border-b-2 border-transparent py-1 transition-colors hover:text-fg"
              activeProps={{ className: 'label border-b-2 border-accent py-1 text-fg' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden sm:block">
            <SearchTrigger />
          </div>

          {/* 📖 The metric pills need more horizontal room than mobile and tablet
              headers provide; the menu keeps those destinations reachable. */}
          <div className="hidden items-center gap-4 lg:flex">
            <GitHubStars href={site.repo} />
            <NpmDownloads href={site.npm} />
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle navigation"
            className="p-2 text-fg-muted transition-colors hover:text-fg md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-bg px-5 py-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={'slug' in item ? item.slug : item.to}
              to={'slug' in item ? '/docs/$' : item.to}
              params={'slug' in item ? { _splat: item.slug } : undefined}
              onClick={() => setOpen(false)}
              className="label block border-b border-border py-3 hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
