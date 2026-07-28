/**
 * @file src/components/CopyPageButton.tsx
 * @description Button to copy page markdown link.
 */
import { useState } from 'react'

export function CopyPageButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded border border-border bg-bg-subtle px-2.5 py-1 font-mono text-[11px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {copied ? 'Link Copied!' : 'Copy Link'}
    </button>
  )
}
