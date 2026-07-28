/**
 * @file src/lib/docs.ts
 * @description Resolves docs slugs to compiled MDX modules.
 */
import type { ComponentType } from 'react'

export type DocFrontmatter = {
  title: string
  description?: string
  section?: string
}

type MdxModule = {
  default: ComponentType<Record<string, unknown>>
  frontmatter?: DocFrontmatter
}

const modules = import.meta.glob<MdxModule>('../content/docs/**/*.mdx', { eager: true })

const bySlug = new Map<string, MdxModule>(
  Object.entries(modules).map(([path, mod]) => [
    path.replace('../content/docs/', '').replace(/\.mdx$/, ''),
    mod,
  ]),
)

export const docSlugs: string[] = [...bySlug.keys()].sort()

export function getDoc(slug: string): { Content: MdxModule['default']; frontmatter: DocFrontmatter } | null {
  const mod = bySlug.get(slug)
  if (!mod) return null
  return {
    Content: mod.default,
    frontmatter: mod.frontmatter ?? { title: slug },
  }
}
