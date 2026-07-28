/**
 * @file src/components/Logo.tsx
 * @description SVG brand mark & wordmark for free-coding-models.
 */

export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer Glow / Base Frame */}
      <rect x="5" y="5" width="90" height="90" rx="20" fill="#121215" stroke="#27272a" strokeWidth="3" />
      
      {/* Terminal prompt symbol & stacked model tier bars */}
      <path d="M25 35L42 50L25 65" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="50" y1="65" x2="75" y2="65" stroke="#10b981" strokeWidth="6" strokeLinecap="round" />
      
      {/* Tier S+ pill indicator */}
      <rect x="50" y="30" width="25" height="10" rx="3" fill="#10b981" opacity="0.85" />
      <rect x="50" y="44" width="18" height="8" rx="2.5" fill="#34d399" opacity="0.5" />
    </svg>
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
        v0.1.17
      </span>
    </div>
  )
}
