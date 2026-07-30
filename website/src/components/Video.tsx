/**
 * @file src/components/Video.tsx
 * @description Inline autoplay-loop video wrapper for the docs.
 *
 * @details
 *   📖 Single source of truth: every video lives in `website/public/videos/`
 *   and is served at `/videos/<name>.mp4` by Vite. The README and any other
 *   doc surface reference the same file at
 *   `website/public/videos/<name>.mp4` — no duplication, one folder.
 *   Drop the recorded file at this path and the wrapper plays immediately.
 *
 *   Convention for recorded files:
 *   - MP4 H.264, 720p, 30fps, no audio, 10–15s, target < 2 MB
 *   - Reference via `<Video name="kebab-case" caption="…" />` in MDX
 */
export function Video({ name, caption }: { name: string; caption?: string }) {
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
