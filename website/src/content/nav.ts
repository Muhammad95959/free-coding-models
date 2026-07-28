/**
 * @file src/content/nav.ts
 * @description Single source of truth for the docs sidebar navigation.
 */

export type DocLink = {
  slug: string
  title: string
}

export type DocGroup = {
  title: string
  items: DocLink[]
}

export const docsNav: DocGroup[] = [
  {
    title: 'Getting started',
    items: [
      { slug: 'introduction', title: 'Introduction' },
      { slug: 'installation', title: 'Installation' },
      { slug: 'quick-start', title: 'Quick start' },
    ],
  },
  {
    title: 'Core concepts',
    items: [
      { slug: 'core/tier-system', title: 'Tier system & SWE scores' },
      { slug: 'core/health-checks', title: 'Health checks & failover' },
      { slug: 'core/providers', title: 'Free provider ecosystem' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { slug: 'integrations/cli-tui', title: 'CLI & Terminal UI' },
      { slug: 'integrations/desktop-app', title: 'Desktop tray utility' },
      { slug: 'integrations/opencode', title: 'OpenCode CLI plugin' },
      { slug: 'integrations/openclaw', title: 'OpenClaw integration' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { slug: 'reference/cli-flags', title: 'CLI flags & commands' },
      { slug: 'reference/config-file', title: 'Configuration & keys' },
    ],
  },
]

export const flatDocs: DocLink[] = docsNav.flatMap((group) => group.items)

export function findDoc(slug: string): DocLink | undefined {
  return flatDocs.find((doc) => doc.slug === slug)
}
