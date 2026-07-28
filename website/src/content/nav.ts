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
      { slug: 'introduction', title: 'Introduction & Architecture' },
      { slug: 'installation', title: 'Installation Guide' },
      { slug: 'quick-start', title: 'Quick Start (API Keys & 60s Setup)' },
    ],
  },
  {
    title: 'Core concepts',
    items: [
      { slug: 'core/router-daemon', title: 'FCM Smart Router & Auto-Failover' },
      { slug: 'core/tier-system', title: 'Tier System & Benchmarks' },
      { slug: 'core/health-checks', title: 'Health Checks & Circuit Breaker' },
      { slug: 'core/providers', title: 'Provider Ecosystem & Keys' },
      { slug: 'core/quotas-telemetry', title: 'Passive Quotas & Telemetry' },
    ],
  },
  {
    title: 'Surfaces & Integrations',
    items: [
      { slug: 'integrations/cli-tui', title: 'CLI Dashboard & Keybindings' },
      { slug: 'integrations/web-dashboard', title: 'Web Dashboard & Server' },
      { slug: 'integrations/opencode', title: 'OpenCode Plugin Integration' },
      { slug: 'integrations/pi-extension', title: 'Pi Agent Extension' },
      { slug: 'integrations/openclaw', title: 'OpenClaw Integration' },
    ],
  },
  {
    title: 'Reference & Support',
    items: [
      { slug: 'reference/cli-flags', title: 'CLI Flags & Commands' },
      { slug: 'reference/config-file', title: 'Configuration File Schema' },
      { slug: 'reference/rest-api', title: 'REST API Specification' },
      { slug: 'reference/troubleshooting', title: 'Troubleshooting & FAQ' },
    ],
  },
]

export const flatDocs: DocLink[] = docsNav.flatMap((group) => group.items)

export function findDoc(slug: string): DocLink | undefined {
  return flatDocs.find((doc) => doc.slug === slug)
}
