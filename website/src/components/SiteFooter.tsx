/**
 * @file src/components/SiteFooter.tsx
 * @description Airy dark footer — Tabler Icons, big readable text, clean columns.
 */
import { Link } from '@tanstack/react-router'
import {
  IconBrandGithub,
  IconBrandNpm,
  IconBrandX,
  IconBook2,
  IconTerminal2,
  IconBug,
  IconHistory,
  IconUser,
  IconRocket,
  IconDownload,
} from '@tabler/icons-react'
import { Wordmark } from './Logo'
import { site } from '~/lib/site'

const DOCS_LINKS = [
  { label: 'Introduction',    slug: 'introduction',         icon: IconBook2 },
  { label: 'Installation',    slug: 'installation',         icon: IconDownload },
  { label: 'Quick Start',     slug: 'quick-start',          icon: IconRocket },
  { label: 'Tier System',     slug: 'core/tier-system',     icon: IconTerminal2 },
  { label: 'CLI Reference',   slug: 'reference/cli-flags',  icon: IconTerminal2 },
] as const

const PROJECT_LINKS = [
  { label: 'GitHub',        href: site.repo,    icon: IconBrandGithub,  external: true },
  { label: 'npm',           href: site.npm,     icon: IconBrandNpm,     external: true },
  { label: 'Issue Tracker', href: site.issues,  icon: IconBug,          external: true },
] as const

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">

        {/* Main grid */}
        <div className="py-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="space-y-5 lg:col-span-2">
            <Wordmark />
            <p className="text-base leading-relaxed text-fg-muted max-w-xs">
              Monitor 100+ free AI coding model endpoints, rank by benchmark, and failover automatically. One tool for every agent.
            </p>
            <p className="text-sm text-fg-faint font-mono">MIT License.</p>
          </div>

          {/* Docs */}
          <div>
            <p className="text-sm font-semibold text-fg mb-5 uppercase tracking-widest font-mono">Documentation</p>
            <ul className="space-y-3">
              {DOCS_LINKS.map(({ label, slug, icon: Icon }) => (
                <li key={slug}>
                  <Link
                    to="/docs/$"
                    params={{ _splat: slug }}
                    className="flex items-center gap-2.5 text-sm text-fg-muted transition-colors hover:text-fg group"
                  >
                    <Icon size={16} className="shrink-0 text-fg-faint group-hover:text-accent transition-colors" stroke={1.5} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Project */}
          <div>
            <p className="text-sm font-semibold text-fg mb-5 uppercase tracking-widest font-mono">Project</p>
            <ul className="space-y-3">
              {PROJECT_LINKS.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-2.5 text-sm text-fg-muted transition-colors hover:text-fg group"
                  >
                    <Icon size={16} className="shrink-0 text-fg-faint group-hover:text-accent transition-colors" stroke={1.5} />
                    {label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  to="/changelogs"
                  className="flex items-center gap-2.5 text-sm text-fg-muted transition-colors hover:text-fg group"
                >
                  <IconHistory size={16} className="shrink-0 text-fg-faint group-hover:text-accent transition-colors" stroke={1.5} />
                  Changelogs
                </Link>
              </li>
              <li>
                <Link
                  to="/creator"
                  className="flex items-center gap-2.5 text-sm text-fg-muted transition-colors hover:text-fg group"
                >
                  <IconUser size={16} className="shrink-0 text-fg-faint group-hover:text-accent transition-colors" stroke={1.5} />
                  Creator
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="border-t border-border py-7 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-sm text-fg-faint">
            © {new Date().getFullYear()} free-coding-models contributors.
          </p>
          <div className="flex items-center gap-5">
            <Link
              to="/creator"
              className="text-sm text-fg-muted hover:text-fg transition-colors flex items-center gap-2"
            >
              <IconUser size={15} stroke={1.5} />
              Vanessa Depraute
            </Link>
            <a
              href={site.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-fg-muted hover:text-fg transition-colors flex items-center gap-2"
            >
              <IconBrandX size={15} stroke={1.5} />
              @vavanessadev
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
