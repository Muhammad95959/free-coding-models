/**
 * @file src/routes/__root.tsx
 * @description Root route component for SPA layout.
 */
import {
  HeadContent,
  Outlet,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { SiteHeader } from '~/components/SiteHeader'
import { SiteFooter } from '~/components/SiteFooter'
import { SearchDialog } from '~/components/DocSearch'
import { site } from '~/lib/site'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: `${site.name} — 100+ Free AI Coding Models` },
      { name: 'description', content: site.description },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      {/* 📖 Route-level titles, descriptions, canonicals, and social metadata
          are inert until TanStack Router's head outlet is mounted. */}
      <HeadContent />
      <div className="min-h-screen bg-bg text-fg antialiased selection:bg-accent selection:text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <SearchDialog />
      </div>
    </>
  )
}
