/**
 * @file src/components/AllToolsSection.tsx
 * @description Grid of every supported coding tool at the bottom of the home
 *   page. Each card shows the tool's logo, name, and one-line tagline,
 *   links to its docs page (or its homepage for tools without docs), and
 *   surfaces a "Read docs" hint on hover.
 *
 *   Also exports the `ToolLogo` component (icon + name block) used by the
 *   marquee, the docs badge, and the grid card.
 */
import { Link } from '@tanstack/react-router'
import {
  IconArrowRight,
  IconBolt,
  IconTerminal2,
} from '@tabler/icons-react'
import { TOOLS, iconUrl, shouldInvert } from '~/lib/tools'
import type { Tool } from '~/lib/tools'

function Shell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>
}

export type ToolLogoProps = {
  tool: Tool
  size?: number
  className?: string
  invert?: boolean
  showLabel?: boolean
}

/** 📖 Reusable tool logo + name block. Renders the SVG (or monogram) plus
 *  the name underneath. Same building block across marquee, grid, and docs. */
export function ToolLogo(props: ToolLogoProps) {
  const tool = props.tool
  const size = props.size ?? 32
  const showLabel = props.showLabel ?? true
  const className = props.className ?? ''
  const invert = props.invert ?? shouldInvert(tool.icon)

  const initials = tool.name
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase()

  const styleImg: React.CSSProperties = { width: size, height: size }
  const clsImg = 'object-contain transition-transform duration-200 ' + (invert ? 'brightness-0 invert' : '')

  let iconEl: React.ReactNode
  if (tool.icon) {
    iconEl = (
      <img
        src={iconUrl(tool.icon)}
        alt={tool.name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={clsImg}
        style={styleImg}
      />
    )
  } else {
    const styleMono: React.CSSProperties = {
      width: size,
      height: size,
      fontSize: size * 0.35,
      backgroundColor: tool.accent ?? '#888',
    }
    iconEl = (
      <div
        className="flex items-center justify-center rounded-md font-mono text-[10px] font-bold text-black"
        style={styleMono}
      >
        {initials}
      </div>
    )
  }

  if (!showLabel) {
    return <div className={className}>{iconEl}</div>
  }

  return (
    <div className={'flex flex-col items-center gap-1.5 ' + className}>
      {iconEl}
      <span className="text-[10px] font-medium text-fg-faint/60">{tool.name}</span>
    </div>
  )
}

/** 📖 Tools with a real `/docs/integrations/<slug>` page get a Link;
 *  everything else falls back to the tool's homepage so the card is
 *  always a useful jump-off point. */
function hasDocsPage(slug: string): boolean {
  return !['jcode', 'crush', 'forgecode', 'zcode', 'caveman'].includes(slug)
}

function ToolCard({ tool }: { tool: Tool }) {
  const hasDocs = hasDocsPage(tool.slug)
  const inner = (
    <div className="group/tool relative flex h-full flex-col items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 p-5 transition-all duration-200 hover:border-border-strong hover:bg-bg-subtle/70">
      <div className="flex h-14 w-14 items-center justify-center">
        <ToolLogo tool={tool} size={40} invert={shouldInvert(tool.icon)} />
      </div>
      <div className="flex flex-col items-center text-center">
        <p className="text-sm font-semibold text-fg">{tool.name}</p>
        <p className="mt-1 text-[11px] leading-tight text-fg-faint">{tool.tagline}</p>
      </div>
      {hasDocs && (
        <span className="mt-auto flex items-center gap-1 text-[11px] font-medium text-fg-faint opacity-0 transition-opacity group-hover/tool:opacity-100">
          Read docs
          <IconArrowRight size={11} stroke={2.5} />
        </span>
      )}
    </div>
  )

  return hasDocs ? (
    <Link
      to="/docs/$"
      params={{ _splat: `integrations/${tool.slug}` }}
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      {inner}
    </Link>
  ) : (
    <a
      href={tool.href}
      target={tool.href !== '#' ? '_blank' : undefined}
      rel={tool.href !== '#' ? 'noopener noreferrer' : undefined}
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      {inner}
    </a>
  )
}

export function AllToolsSection() {
  return (
    <section className="border-b border-border py-20 sm:py-28">
      <Shell>
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <IconBolt size={14} className="text-fg-muted" stroke={1.75} />
              <span className="font-mono text-xs font-medium text-fg-faint uppercase tracking-wider">
                05 — One-click launch
              </span>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              Every coding tool, ready to go.
            </h2>
            <p className="mt-3 max-w-xl text-base text-fg-muted sm:text-lg">
              FCM writes the picked model into each tool's native config and launches it — no
              copy-pasting, no flag juggling. Pick a card to see the integration docs.
            </p>
          </div>
          <Link
            to="/docs/$"
            params={{ _splat: 'integrations/cli-tui' }}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-raised/40 px-3.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-bg-raised hover:text-fg"
          >
            <IconTerminal2 size={15} stroke={1.75} />
            How it works
            <IconArrowRight size={14} stroke={2} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {TOOLS.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </Shell>
    </section>
  )
}
