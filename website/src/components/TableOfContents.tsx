/**
 * @file src/components/TableOfContents.tsx
 * @description Right-side Table of Contents tracking current page headings.
 */
import { useEffect, useState } from 'react'

export interface TocItem {
  id: string
  text: string
  level: number
}

export function TableOfContents({ containerId }: { containerId: string }) {
  const [headings, setHeadings] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const el = document.getElementById(containerId)
    if (!el) return

    const nodes = Array.from(el.querySelectorAll('h2, h3'))
    const items: TocItem[] = nodes.map((node) => ({
      id: node.id,
      text: node.textContent?.replace('#', '').trim() ?? '',
      level: Number(node.tagName.substring(1)),
    }))

    setHeadings(items)

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' }
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [containerId])

  if (headings.length === 0) return null

  return (
    <nav aria-label="Table of contents" className="space-y-3">
      <p className="label text-fg-faint">On this page</p>
      <ul className="space-y-2 font-mono text-xs">
        {headings.map((item) => (
          <li key={item.id} style={{ paddingLeft: `${(item.level - 2) * 0.75}rem` }}>
            <a
              href={`#${item.id}`}
              className={`block transition-colors ${
                activeId === item.id ? 'text-accent font-medium' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
