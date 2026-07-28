/**
 * @file src/routes/__root.tsx
 * @description Root route component for SPA layout.
 */
import {
  Outlet,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { SiteHeader } from '~/components/SiteHeader'
import { SiteFooter } from '~/components/SiteFooter'
import { SearchDialog } from '~/components/DocSearch'

export const Route = createRootRoute({
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
  )
}
