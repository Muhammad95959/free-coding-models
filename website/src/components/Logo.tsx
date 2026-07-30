/**
 * @file src/components/Logo.tsx
 * @description Shared icon.png-derived brand mark and wordmark for free-coding-models.
 */

export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/android-chrome-192x192.png"
      alt=""
      width={size}
      height={size}
      className={`rounded-[22%] object-cover ${className}`}
      aria-hidden="true"
    />
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={24} />
      <span className="font-mono text-sm font-semibold tracking-tight text-fg">
        free-coding-models
      </span>
      <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-accent-fg">
        v0.5.69
      </span>
    </div>
  )
}
