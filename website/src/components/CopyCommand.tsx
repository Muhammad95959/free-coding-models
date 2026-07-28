/**
 * @file src/components/CopyCommand.tsx
 * @description Copy command pill component with visual feedback.
 */
import { useState } from 'react'

export function CopyCommand({
  command,
  className = '',
}: {
  command: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
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
      className={`group relative flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-raised/90 px-4 py-3 font-mono text-xs text-fg transition-all hover:border-accent/50 ${className}`}
      title="Click to copy command"
    >
      <div className="flex items-center gap-2.5 overflow-x-auto text-left">
        <span className="text-accent-fg select-none">$</span>
        <span className="font-medium text-fg">{command}</span>
      </div>
      <span className="shrink-0 rounded bg-bg-subtle px-2 py-1 text-[10px] font-medium text-fg-muted transition-colors group-hover:text-accent-fg">
        {copied ? 'Copied! ✓' : 'Copy'}
      </span>
    </button>
  )
}
