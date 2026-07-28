/**
 * @file src/routes/changelogs/route.tsx
 * @description The `/changelogs` layout: sticky version sidebar on the left, article outlet on the right.
 * Replicates Kandown's changelog layout architecture.
 */

import { useState } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ChangelogSidebar, MobileChangelogSidebar } from '~/components/ChangelogSidebar'
import { getAllChangelogs } from '~/lib/changelogs'
import { Menu, Layers } from 'lucide-react'

export const Route = createFileRoute('/changelogs')({
  loader: () => getAllChangelogs(),
  component: ChangelogsLayout,
})

function ChangelogsLayout() {
  const [navOpen, setNavOpen] = useState(false)
  const entries = Route.useLoaderData() ?? []

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="grid gap-0 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        {/* Left Sticky Sidebar on Desktop */}
        <aside className="hidden lg:block lg:border-r lg:border-border">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-6">
            <div className="mb-4 pb-3 border-b border-border/60 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-fg flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-accent-fg" /> Versions
              </span>
              <span className="font-mono text-[10px] text-fg-faint bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
                {entries.length} releases
              </span>
            </div>
            <ChangelogSidebar entries={entries} />
          </div>
        </aside>

        {/* Mobile Toolbar for versions drawer */}
        <div className="sticky top-14 z-40 -mx-5 mb-2 flex items-center justify-between border-b border-border bg-bg/85 px-5 py-2.5 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="flex items-center gap-2 border border-border bg-bg-raised px-3 py-1.5 rounded-lg font-mono text-xs text-fg hover:border-border-strong cursor-pointer"
          >
            <Menu className="w-4 h-4 text-accent-fg" />
            Versions
          </button>
          <span className="font-mono text-xs text-fg-faint">
            {entries.length} releases
          </span>
        </div>

        {/* Right Article Outlet */}
        <div className="min-w-0 lg:col-start-2">
          <Outlet />
        </div>
      </div>

      <MobileChangelogSidebar
        entries={entries}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
    </div>
  )
}
