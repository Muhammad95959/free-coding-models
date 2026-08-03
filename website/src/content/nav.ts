/**
 * @file src/content/nav.ts
 * @description Single source of truth for the docs sidebar navigation.
 *
 * 📖 Group order reflects product priority: the TUI and Web Dashboard are the
 *    CORE surfaces most users live in, so they come first. The Smart Model
 *    Router is the most advanced surface, so it sits LAST under Core concepts.
 */

export type DocLink = {
  slug: string
  title: string
}

export type DocGroup = {
  title: string
  items: DocLink[]
  /** 📖 If set, only the first N items are shown by default in the sidebar.
   *  The rest are hidden behind a "View N more..." toggle. The currently
   *  active item is always kept visible even when the group is collapsed. */
  primaryCount?: number
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
    title: 'Surfaces (core)',
    items: [
      { slug: 'integrations/cli-tui', title: 'Terminal Dashboard (TUI)' },
      { slug: 'integrations/web-dashboard', title: 'Web Dashboard' },
      { slug: 'integrations/docker-web', title: 'Docker Server' },
    ],
  },
  {
    title: 'Providers',
    primaryCount: 9,
    items: [
      { slug: 'providers', title: 'Overview' },
      { slug: 'providers/nvidia', title: 'NVIDIA NIM' },
      { slug: 'providers/groq', title: 'Groq' },
      { slug: 'providers/cerebras', title: 'Cerebras' },
      { slug: 'providers/googleai', title: 'Google AI Studio' },
      { slug: 'providers/openrouter', title: 'OpenRouter' },
      { slug: 'providers/mistral', title: 'Mistral' },
      { slug: 'providers/cloudflare', title: 'Cloudflare Workers AI' },
      { slug: 'providers/github-models', title: 'GitHub Models' },
      { slug: 'providers/ovhcloud', title: 'OVHcloud' },
      { slug: 'providers/sambanova', title: 'SambaNova' },
      { slug: 'providers/codestral', title: 'Codestral' },
      { slug: 'providers/zai', title: 'ZAI' },
      { slug: 'providers/scaleway', title: 'Scaleway' },
      { slug: 'providers/qwen', title: 'Alibaba DashScope' },
      { slug: 'providers/opencode-zen', title: 'OpenCode Zen' },
      { slug: 'providers/kilo', title: 'Kilo' },
      { slug: 'providers/llm7', title: 'LLM7' },
      { slug: 'providers/routeway', title: 'Routeway' },
      { slug: 'providers/novita', title: 'Novita' },
      { slug: 'providers/ollama-cloud', title: 'Ollama Cloud' },
    ],
  },
  {
    title: 'Agent Integrations',
    primaryCount: 9,
    items: [
      { slug: 'integrations/opencode', title: 'OpenCode' },
      { slug: 'integrations/pi', title: 'Pi' },
      { slug: 'integrations/hermes', title: 'Hermes' },
      { slug: 'integrations/openclaw', title: 'OpenClaw' },
      { slug: 'integrations/qwen', title: 'Qwen Code' },
      { slug: 'integrations/cline', title: 'Cline' },
      { slug: 'integrations/goose', title: 'Goose' },
      { slug: 'integrations/kilo', title: 'Kilo' },
      { slug: 'integrations/jcode', title: 'jcode' },
      { slug: 'integrations/crush', title: 'Crush' },
      { slug: 'integrations/aider', title: 'Aider' },
      { slug: 'integrations/continue', title: 'Continue' },
      { slug: 'integrations/amp', title: 'Amp' },
      { slug: 'integrations/forgecode', title: 'ForgeCode' },
      { slug: 'integrations/zcode', title: 'ZCode' },
      { slug: 'integrations/caveman', title: 'Caveman Code' },
      { slug: 'integrations/copilot', title: 'Copilot CLI' },
      { slug: 'integrations/openhands', title: 'OpenHands' },
      { slug: 'integrations/xcode', title: 'Xcode Intelligence' },
    ],
  },
  {
    title: 'Core concepts & advanced',
    items: [
      { slug: 'core/tier-system', title: 'Tier System & Benchmarks' },
      { slug: 'core/health-checks', title: 'Health Checks & Circuit Breaker' },
      { slug: 'core/providers', title: 'Provider Ecosystem & Keys' },
      { slug: 'core/quotas-telemetry', title: 'Quotas & Runtime Telemetry' },
      { slug: 'core/router-daemon', title: 'Smart Model Router (advanced)' },
    ],
  },
  {
    title: 'Reference & Support',
    items: [
      { slug: 'reference/cli-flags', title: 'CLI Flags & Commands' },
      { slug: 'reference/config-file', title: 'Configuration File' },
      { slug: 'reference/rest-api', title: 'REST API Specification' },
      { slug: 'reference/troubleshooting', title: 'Troubleshooting & FAQ' },
    ],
  },
]

export const flatDocs: DocLink[] = docsNav.flatMap((group) => group.items)

export function findDoc(slug: string): DocLink | undefined {
  return flatDocs.find((doc) => doc.slug === slug)
}
