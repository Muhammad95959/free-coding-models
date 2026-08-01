/**
 * @file src/components/CodeWindow.tsx
 * @description Dark terminal & code window component with tabs.
 */
import { useState } from 'react'

export interface CodeTab {
  id: string
  label: string
  filename?: string
  content: string
}

export function CodeWindow({
  tabs,
  className = '',
}: {
  tabs: CodeTab[]
  className?: string
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '')

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0]

  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-[#0a0a0d] shadow-2xl ${className}`}>
      {/* Title bar with traffic lights and tab switchers */}
      <div className="flex items-center justify-between border-b border-border bg-[#121216] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56]/80" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]/80" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f]/80" />
          <span className="ml-2 font-mono text-[11px] font-medium text-fg-faint">
            {activeTab?.filename ?? activeTab?.label}
          </span>
        </div>

        {tabs.length > 1 && (
          <div className="flex items-center gap-1 rounded-md bg-bg-subtle p-0.5 font-mono text-[11px]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveId(tab.id)}
                className={`rounded px-2.5 py-1 transition-colors ${
                  activeId === tab.id
                    ? 'bg-accent/20 font-bold text-accent-fg border border-accent/30'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Code body */}
      <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-fg-muted">
        <code>
          {activeTab?.content.split('\n').map((line, i) => (
            <div key={i} className="table-row">
              <span className="table-cell pr-4 text-right select-none font-mono text-[11px] text-fg-faint/40">
                {i + 1}
              </span>
              <span className="table-cell">{line}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  )
}
