/**
 * @file src/lib/tools.ts
 * @description Single source of truth for the tools and providers we ship
 *   integration docs for.
 */

const LOBEHUB = 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1/icons'
const SIMPLE_ICONS = 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons'
const ICONIFY = 'https://api.iconify.design'

export type IconRef =
  | { kind: 'lobe'; slug: string; color: boolean }
  | { kind: 'simple'; slug: string }
  | { kind: 'iconify'; prefix: string; slug: string }
  | { kind: 'raw'; url: string }

export function iconUrl(ref: IconRef): string {
  if (ref.kind === 'lobe') {
    const suffix = ref.color ? '-color' : ''
    return LOBEHUB + '/' + ref.slug + suffix + '.svg'
  }
  if (ref.kind === 'simple') {
    return SIMPLE_ICONS + '/' + ref.slug + '.svg'
  }
  if (ref.kind === 'iconify') {
    return ICONIFY + '/' + ref.prefix + '/' + ref.slug + '.svg'
  }
  return ref.url
}

export type Tool = {
  slug: string
  name: string
  tagline: string
  icon: IconRef | null
  accent?: string
  href: string
}

export const TOOLS: Tool[] = [
  { slug: 'opencode',  name: 'OpenCode',    tagline: 'CLI, Desktop & WebUI',   icon: { kind: 'lobe', slug: 'opencode', color: false },   href: 'https://opencode.ai' },
  { slug: 'pi',        name: 'Pi',          tagline: 'Terminal coding agent',   icon: { kind: 'lobe', slug: 'pi', color: false },            href: 'https://pi.dev' },
  { slug: 'hermes',    name: 'Hermes',      tagline: 'Anthropic SDK wrapper',   icon: { kind: 'lobe', slug: 'hermesagent', color: false },  href: 'https://github.com/hermes-agent' },
  { slug: 'openclaw',  name: 'OpenClaw',    tagline: 'Agentic CLI',             icon: { kind: 'lobe', slug: 'openclaw', color: true },     href: 'https://github.com/openclaw-ai' },
  { slug: 'qwen',      name: 'Qwen Code',   tagline: 'Alibaba coding agent',   icon: { kind: 'lobe', slug: 'qwen', color: true },           href: 'https://qwenlm.github.io/qwen-code-cli/' },
  { slug: 'cline',     name: 'Cline',       tagline: 'VS Code AI agent',        icon: { kind: 'lobe', slug: 'cline', color: false },         href: 'https://cline.bot' },
  { slug: 'goose',     name: 'Goose',       tagline: 'Block coding agent',     icon: { kind: 'lobe', slug: 'goose', color: false },         href: 'https://github.com/block-open-source/goose' },
  { slug: 'kilo',      name: 'Kilo',        tagline: 'VS Code AI agent',        icon: { kind: 'lobe', slug: 'kilocode', color: false },       href: 'https://kilocode.ai' },
  { slug: 'aider',     name: 'Aider',       tagline: 'AI pair programming',    icon: { kind: 'raw', url: 'https://cdn.jsdelivr.net/gh/Aider-AI/aider@main/aider/website/assets/logo.svg' }, href: 'https://aider.chat' },
  { slug: 'continue',  name: 'Continue',    tagline: 'Open-source IDE plugin',  icon: { kind: 'iconify', prefix: 'carbon', slug: 'continue' }, href: 'https://continue.dev' },
  { slug: 'amp',       name: 'Amp',         tagline: 'Sourcegraph coding agent', icon: { kind: 'lobe', slug: 'amp', color: true },            href: 'https://ampcode.com' },
  { slug: 'copilot',   name: 'Copilot CLI', tagline: 'GitHub Copilot in terminal', icon: { kind: 'lobe', slug: 'copilot', color: true },    href: 'https://github.com/features/copilot/cli' },
  { slug: 'openhands', name: 'OpenHands',   tagline: 'Open-source agent',      icon: { kind: 'lobe', slug: 'openhands', color: true },      href: 'https://www.all-hands.dev' },
  { slug: 'xcode',     name: 'Xcode',       tagline: 'Apple IDE integration',  icon: { kind: 'lobe', slug: 'apple', color: false },         href: 'https://developer.apple.com/xcode/' },
  { slug: 'jcode',     name: 'jcode',       tagline: 'JPMorgan coding agent',  icon: null, accent: '#7c5cff', href: '#' },
  { slug: 'crush',     name: 'Crush',       tagline: 'Charm coding agent',     icon: null, accent: '#ff6b9d', href: 'https://github.com/charmbracelet/crush' },
  { slug: 'forgecode', name: 'ForgeCode',   tagline: 'Forge coding agent',     icon: null, accent: '#f59e0b', href: 'https://forgecode.dev' },
  { slug: 'zcode',     name: 'ZCode',       tagline: 'Zed-based coding agent', icon: null, accent: '#06b6d4', href: 'https://zcode.dev' },
  { slug: 'caveman',   name: 'Caveman',     tagline: 'Caveman Code',           icon: null, accent: '#a16207', href: '#' },
]

export function getToolBySlug(slug: string): Tool | null {
  for (const t of TOOLS) {
    if (t.slug === slug) return t
  }
  return null
}

export function shouldInvert(ref: IconRef | null): boolean {
  if (!ref) return false
  if (ref.kind === 'lobe') return !ref.color
  if (ref.kind === 'simple') return true
  if (ref.kind === 'iconify') return true
  return false
}
