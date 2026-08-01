/**
 * @file src/components/Video.tsx
 * @description Inline autoplay-loop video wrapper for the docs.
 * Gracefully hides if video file is missing.
 */
import { useState } from 'react'

export function Video({ name, caption }: { name: string; caption?: string }) {
  const [hasError, setHasError] = useState(false)

  if (hasError) return null

  return (
    <figure className="my-6">
      <div className="overflow-hidden rounded-lg border border-border bg-bg-subtle">
        <video
          src={`/videos/${name}.mp4`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setHasError(true)}
          className="block w-full"
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-fg-faint font-mono">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
