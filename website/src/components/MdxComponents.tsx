/**
 * @file src/components/MdxComponents.tsx
 * @description MDX component overrides for prose rendering.
 */
import type { ComponentPropsWithoutRef } from 'react'

export const mdxComponents = {
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="text-3xl font-semibold tracking-tight text-fg my-6" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-2xl font-semibold tracking-tight text-fg mt-10 mb-4 border-t border-border pt-6" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-xl font-semibold tracking-tight text-fg mt-8 mb-3" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="leading-relaxed text-fg-muted my-4" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="list-disc list-inside space-y-2 text-fg-muted my-4" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="list-decimal list-inside space-y-2 text-fg-muted my-4" {...props} />
  ),
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="border-l-4 border-accent pl-4 italic text-fg my-4" {...props} />
  ),
  code: (props: ComponentPropsWithoutRef<'code'>) => (
    <code className="font-mono text-xs bg-bg-subtle border border-border px-1.5 py-0.5 rounded text-fg" {...props} />
  ),
}
