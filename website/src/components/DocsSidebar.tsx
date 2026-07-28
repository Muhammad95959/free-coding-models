/**
 * @file src/components/DocsSidebar.tsx
 * @description Sidebar navigation component for docs.
 */
import { Link, useRouterState } from '@tanstack/react-router'
import { docsNav } from '~/content/nav'

export function DocsSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav className="space-y-7">
      {docsNav.map((group) => (
        <div key={group.title}>
          <p className="label mb-2.5 text-fg-faint">{group.title}</p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = pathname === `/docs/${item.slug}`
              return (
                <li key={item.slug}>
                  <Link
                    to="/docs/$"
                    params={{ _splat: item.slug }}
                    className={`block border-l-2 py-1 pl-3 font-mono text-xs transition-colors ${
                      active
                        ? 'border-accent text-fg font-semibold'
                        : 'border-transparent text-fg-muted hover:border-border-strong hover:text-fg'
                    }`}
                  >
                    {item.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex bg-bg/90 backdrop-blur-md lg:hidden">
      <div className="w-4/5 max-w-xs border-r border-border bg-bg p-6 overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent-fg">
            Documentation
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-fg-muted hover:text-fg font-mono text-sm"
          >
            ✕
          </button>
        </div>
        <DocsSidebar />
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  )
}
