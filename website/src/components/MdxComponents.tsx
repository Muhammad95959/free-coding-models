/**
 * @file src/components/MdxComponents.tsx
 * @description MDX component overrides & custom documentation components (Callouts, CodeBlocks with Copy, Badges, Steps, Cards, Tabs).
 */
import { useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { 
  Check, 
  Copy, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ChevronRight,
  Terminal,
  Cpu,
  Zap,
  ShieldCheck,
  Server
} from 'lucide-react'
import { Video } from './Video'

// --- Custom Copy Button for Code Blocks ---
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-bg-subtle/80 hover:bg-bg-raised text-fg-muted hover:text-fg border border-border transition-all cursor-pointer"
      title="Copy code to clipboard"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-accent-fg" />
          <span className="text-accent-fg font-medium">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  )
}

// --- Custom Callout Box ---
export function Callout({
  type = 'note',
  title,
  children,
}: {
  type?: 'note' | 'tip' | 'warning' | 'danger'
  title?: string
  children: ReactNode
}) {
  const config = {
    note: {
      border: 'border-blue-500/40 bg-blue-950/20 text-blue-200',
      icon: <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Note',
      titleColor: 'text-blue-300',
    },
    tip: {
      border: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200',
      icon: <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Pro Tip',
      titleColor: 'text-emerald-300',
    },
    warning: {
      border: 'border-amber-500/40 bg-amber-950/20 text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Warning',
      titleColor: 'text-amber-300',
    },
    danger: {
      border: 'border-rose-500/40 bg-rose-950/20 text-rose-200',
      icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Important',
      titleColor: 'text-rose-300',
    },
  }[type]

  return (
    <div className={`my-6 rounded-lg border p-4 font-sans text-sm leading-relaxed ${config.border}`}>
      <div className="flex gap-3">
        {config.icon}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold mb-1 ${config.titleColor}`}>
            {title || config.defaultTitle}
          </p>
          <div className="text-fg-muted [&>p]:my-1 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Custom Badge ---
export function Badge({
  variant = 'tier',
  children,
}: {
  variant?: 'tier' | 's-plus' | 's' | 'a-plus' | 'a' | 'b' | 'c' | 'success' | 'warning' | 'danger'
  children: ReactNode
}) {
  const styles: Record<string, string> = {
    's-plus': 'bg-purple-950/60 text-purple-300 border-purple-500/40',
    's': 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    'a-plus': 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
    'a': 'bg-blue-950/60 text-blue-300 border-blue-500/40',
    'b': 'bg-amber-950/60 text-amber-300 border-amber-500/40',
    'c': 'bg-zinc-900 text-zinc-400 border-zinc-700',
    'tier': 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    'success': 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    'warning': 'bg-amber-950/60 text-amber-300 border-amber-500/40',
    'danger': 'bg-rose-950/60 text-rose-300 border-rose-500/40',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium rounded border ${styles[variant] || styles.tier}`}>
      {children}
    </span>
  )
}

// --- Custom Card & CardGrid ---
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4 my-6">{children}</div>
}

export function Card({
  title,
  description,
  href,
  icon,
}: {
  title: string
  description: string
  href?: string
  icon?: string
}) {
  const IconComponent = () => {
    switch (icon) {
      case 'terminal': return <Terminal className="w-5 h-5 text-accent-fg" />
      case 'cpu': return <Cpu className="w-5 h-5 text-accent-fg" />
      case 'zap': return <Zap className="w-5 h-5 text-accent-fg" />
      case 'shield': return <ShieldCheck className="w-5 h-5 text-accent-fg" />
      case 'server': return <Server className="w-5 h-5 text-accent-fg" />
      default: return <ChevronRight className="w-5 h-5 text-accent-fg" />
    }
  }

  const Content = (
    <div className="group border border-border bg-bg-subtle/50 hover:bg-bg-raised hover:border-border-strong rounded-lg p-5 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <IconComponent />
          <h3 className="font-semibold text-fg text-base m-0 group-hover:text-accent-fg transition-colors">
            {title}
          </h3>
        </div>
        <ChevronRight className="w-4 h-4 text-fg-faint group-hover:text-fg group-hover:translate-x-0.5 transition-all" />
      </div>
      <p className="text-xs text-fg-muted m-0 leading-relaxed">{description}</p>
    </div>
  )

  if (href) {
    return <a href={href} className="no-underline block">{Content}</a>
  }

  return Content
}

// --- Custom Steps ---
export function Steps({ children }: { children: ReactNode }) {
  return <div className="my-6 space-y-6 border-l-2 border-border pl-6 relative">{children}</div>
}

export function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute -left-[35px] top-0 flex items-center justify-center w-6 h-6 rounded-full bg-accent-soft border border-accent text-accent-fg font-mono text-xs font-bold">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-fg mt-0 mb-2">{title}</h3>
      <div className="text-sm text-fg-muted">{children}</div>
    </div>
  )
}

// --- Custom Interactive Pre CodeBlock ---
function PreBlock(props: ComponentPropsWithoutRef<'pre'>) {
  const { children, ...rest } = props

  // Extract raw text content for copy button
  let rawText = ''
  if (children && typeof children === 'object' && 'props' in children) {
    const codeProps = (children as { props?: { children?: ReactNode } }).props
    if (typeof codeProps?.children === 'string') {
      rawText = codeProps.children
    } else if (Array.isArray(codeProps?.children)) {
      rawText = codeProps.children.map((c) => (typeof c === 'string' ? c : '')).join('')
    }
  }

  return (
    <div className="relative group my-5 rounded-lg border border-border bg-code-bg overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-bg-subtle/90 border-b border-border text-xs font-mono text-fg-faint">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
          <span className="ml-2 text-fg-muted">code execution</span>
        </div>
        {rawText && <CopyButton text={rawText} />}
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-fg m-0 border-0 bg-transparent" {...rest}>
        {children}
      </pre>
    </div>
  )
}

// --- MDX Provider Overrides ---
export const mdxComponents = {
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="text-3xl font-semibold tracking-tight text-fg my-6" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-2xl font-semibold tracking-tight text-fg mt-12 mb-4 border-t border-border pt-8" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-xl font-semibold tracking-tight text-fg mt-8 mb-3" {...props} />
  ),
  h4: (props: ComponentPropsWithoutRef<'h4'>) => (
    <h4 className="text-lg font-medium text-fg mt-6 mb-2" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="leading-relaxed text-fg-muted my-4 text-sm sm:text-base" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="list-disc list-inside space-y-2 text-fg-muted my-4 text-sm sm:text-base" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="list-decimal list-inside space-y-2 text-fg-muted my-4 text-sm sm:text-base" {...props} />
  ),
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="border-l-4 border-accent pl-4 italic text-fg my-5 bg-accent-soft/20 py-2 rounded-r" {...props} />
  ),
  code: (props: ComponentPropsWithoutRef<'code'>) => (
    <code className="font-mono text-xs bg-bg-subtle border border-border px-1.5 py-0.5 rounded text-accent-fg font-semibold" {...props} />
  ),
  pre: PreBlock,
  // 📖 Wrap every MDX table in a horizontal-scroll box so a genuinely wide table
  // scrolls *inside* the page instead of stretching the viewport. Cell content
  // still wraps (see `.prose table` in styles.css), so most tables just fit.
  table: (props: ComponentPropsWithoutRef<'table'>) => (
    <div className="table-scroll">
      <table {...props} />
    </div>
  ),
  // 📖 Video: see src/components/Video.tsx. Videos live in website/public/videos/.
  Video,
  Callout,
  Badge,
  CardGrid,
  Card,
  Steps,
  Step,
}
