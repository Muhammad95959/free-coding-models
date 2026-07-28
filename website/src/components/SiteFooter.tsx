/**
 * @file src/components/SiteFooter.tsx
 * @description Minimalist dark footer with project links, docs nav, social links, and copyright.
 */
import { Link } from '@tanstack/react-router'
import { Wordmark } from './Logo'
import { site } from '~/lib/site'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg text-fg-muted">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-2">
            <Wordmark />
            <p className="max-w-sm text-xs leading-relaxed text-fg-muted">
              {site.description}
            </p>
            <p className="font-mono text-[11px] text-fg-faint">
              Released under the MIT License. Built for developers by developers.
            </p>
          </div>

          <div>
            <p className="label mb-3 text-fg">Documentation</p>
            <ul className="space-y-2 font-mono text-xs">
              <li>
                <Link to="/docs/$" params={{ _splat: 'introduction' }} className="transition-colors hover:text-fg">
                  Introduction
                </Link>
              </li>
              <li>
                <Link to="/docs/$" params={{ _splat: 'installation' }} className="transition-colors hover:text-fg">
                  Installation
                </Link>
              </li>
              <li>
                <Link to="/docs/$" params={{ _splat: 'quick-start' }} className="transition-colors hover:text-fg">
                  Quick Start
                </Link>
              </li>
              <li>
                <Link to="/docs/$" params={{ _splat: 'core/tier-system' }} className="transition-colors hover:text-fg">
                  Tier System
                </Link>
              </li>
              <li>
                <Link to="/docs/$" params={{ _splat: 'reference/cli-flags' }} className="transition-colors hover:text-fg">
                  CLI Reference
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="label mb-3 text-fg">Project</p>
            <ul className="space-y-2 font-mono text-xs">
              <li>
                <a href={site.repo} target="_blank" rel="noreferrer noopener" className="transition-colors hover:text-fg">
                  GitHub Repository ↗
                </a>
              </li>
              <li>
                <a href={site.npm} target="_blank" rel="noreferrer noopener" className="transition-colors hover:text-fg">
                  npm Package ↗
                </a>
              </li>
              <li>
                <a href={site.issues} target="_blank" rel="noreferrer noopener" className="transition-colors hover:text-fg">
                  Issue Tracker ↗
                </a>
              </li>
              <li>
                <Link to="/changelogs" className="transition-colors hover:text-fg">
                  Changelogs
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 font-mono text-[11px] text-fg-faint sm:flex-row">
          <p>© {new Date().getFullYear()} free-coding-models contributors.</p>
          <p>Created by {site.author}</p>
        </div>
      </div>
    </footer>
  )
}
