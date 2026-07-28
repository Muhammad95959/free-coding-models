/**
 * @file src/routes/changelogs/index.tsx
 * @description Changelogs overview page.
 */
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/changelogs/')({
  component: ChangelogsPage,
})

const releases = [
  { version: '0.1.17', date: '2026-05-20', title: 'Improved auto-failover latency checks & SWE rankings' },
  { version: '0.1.16', date: '2026-05-10', title: 'Added OpenClaw patch engine & OpenCode CLI plugin support' },
  { version: '0.1.15', date: '2026-04-28', title: 'Tauri Desktop tray background status daemon' },
  { version: '0.1.10', date: '2026-04-12', title: 'Initial release with 100+ free models catalog' },
]

function ChangelogsPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <header className="mb-10 border-b border-border pb-6">
        <span className="label">Changelogs</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg">Release History</h1>
        <p className="mt-2 font-mono text-sm text-fg-muted">
          All notable changes to free-coding-models are documented here.
        </p>
      </header>

      <div className="space-y-6">
        {releases.map((rel) => (
          <div key={rel.version} className="rounded-xl border border-border bg-bg-raised p-6">
            <div className="flex items-center justify-between font-mono text-xs mb-2">
              <span className="font-semibold text-accent-fg">v{rel.version}</span>
              <span className="text-fg-faint">{rel.date}</span>
            </div>
            <h2 className="font-mono text-base font-medium text-fg">{rel.title}</h2>
          </div>
        ))}
      </div>
    </div>
  )
}
