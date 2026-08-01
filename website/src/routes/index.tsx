/**
 * @file src/routes/index.tsx
 * @description Landing page for free-coding-models — minimal, elegant, direct.
 * Tabler Icons used throughout for visual consistency.
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  IconRadar,
  IconBolt,
  IconServer2,
  IconTerminal2,
  IconBrandDocker,
  IconRocket,
  IconBrandGithub,
  IconCheck,
  IconActivity,
} from '@tabler/icons-react'
import { CopyCommand } from '~/components/CopyCommand'
import { INSTALL_COMMAND, site } from '~/lib/site'
import HeroGeometric from '~/components/HeroGeometric'
import { HomeStructuredData } from '~/components/StructuredData'
import { CometCard } from '~/components/ui/comet-card'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <>
      <HomeStructuredData />
      <Hero />
      <MonitorSection />
      <TierSection />
      <IntegrationsSection />
      <CtaSection />
    </>
  )
}

function Shell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative border-b border-border overflow-hidden bg-bg">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <HeroGeometric color1="#c3ed06" color2="#080c04" speed={1.5} className="w-full h-full min-h-[640px]" />
      </div>
      <Shell className="relative z-10">
        <div className="py-20 sm:py-32 flex flex-col items-start max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="rounded-full bg-accent/20 px-3.5 py-1.5 font-mono text-xs font-semibold text-accent-fg border border-accent/40">
              Free · Open Source · Zero Config
            </span>
          </div>

          <h1 className="animate-rise text-[3rem] leading-[1.04] font-semibold tracking-[-0.04em] text-balance sm:text-[5rem] text-fg">
            Monitor 100+ free AI&nbsp;coding&nbsp;models.
            <br />
            <span className="text-fg-muted">Never&nbsp;hit&nbsp;a&nbsp;quota&nbsp;wall.</span>
          </h1>

          <p className="animate-rise mt-8 max-w-2xl text-xl leading-relaxed text-fg-muted">
            free-coding-models pings every free AI endpoint in real time, ranks them by benchmark score, and switches automatically when a provider cuts you off.
          </p>

          <div className="animate-rise mt-10 flex flex-col gap-5 sm:flex-row sm:items-center">
            <Link
              to="/docs/$"
              params={{ _splat: 'quick-start' }}
              className="group inline-flex items-center gap-2.5 self-start rounded-md bg-accent px-6 py-3.5 font-mono text-sm font-bold text-ink shadow-[0_0_25px_rgba(195,237,6,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(195,237,6,0.5)]"
            >
              <IconRocket size={18} stroke={2} />
              Get started
            </Link>
            <a
              href={site.repo}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 font-mono text-sm font-medium text-fg-muted transition-colors hover:text-fg"
            >
              <IconBrandGithub size={18} stroke={1.75} />
              GitHub
            </a>
          </div>
        </div>

        <div className="animate-rise pb-16 sm:pb-24">
          <CometCard className="max-w-xl">
            <div className="hero-card-surface rounded-xl border border-accent/30 p-4 backdrop-blur-md">
              <CopyCommand command={INSTALL_COMMAND} className="w-full" />
            </div>
          </CometCard>
        </div>
      </Shell>
    </section>
  )
}

/* ── Monitor Section ──────────────────────────────────────────────────────── */

function MonitorSection() {
  const stats = [
    {
      icon: IconRadar,
      number: '100+',
      label: 'Free endpoints monitored',
      detail: 'Google, NVIDIA, Groq, Cerebras, Scaleway, Mistral, and more — all pinged in parallel.',
    },
    {
      icon: IconBolt,
      number: '<100ms',
      label: 'Failover latency',
      detail: 'When a provider returns 429 or a timeout, the next model takes over instantly.',
    },
    {
      icon: IconServer2,
      number: '14',
      label: 'Active free providers',
      detail: 'Updated continuously as providers launch new free tiers or deprecate old models.',
    },
  ]

  return (
    <section className="border-b border-[#d4e6a0] bg-[#f5f9e8] py-20 sm:py-28">
      <Shell>
        <div className="max-w-xl mb-14">
          <span className="font-mono text-xs font-bold text-[#5c7a00] uppercase tracking-wider">01 — How it works</span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900">
            A live dashboard for free AI servers.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-700">
            Every free provider has its own rate limits, latency, and uptime. free-coding-models pings them all in parallel so you always know what's working right now.
          </p>
        </div>

        <div className="grid gap-px bg-[#d4e6a0] border border-[#d4e6a0] rounded-2xl overflow-hidden sm:grid-cols-3">
          {stats.map(({ icon: Icon, number, label, detail }) => (
            <div key={number} className="bg-white px-8 py-10">
              <Icon size={28} className="text-[#8ab800] mb-4" stroke={1.5} />
              <p className="font-mono text-5xl font-black text-[#5c7a00]">{number}</p>
              <p className="mt-3 font-semibold text-slate-900 text-base">{label}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{detail}</p>
            </div>
          ))}
        </div>
      </Shell>
    </section>
  )
}

/* ── Tier Section ─────────────────────────────────────────────────────────── */

function TierSection() {
  return (
    <section className="border-b border-[#1f2d0e] bg-[#080d04] py-20 sm:py-28">
      <Shell>
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <IconActivity size={16} className="text-accent-fg" stroke={1.75} />
              <span className="font-mono text-xs font-bold text-accent-fg uppercase tracking-wider">02 — Benchmark ranking</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
              Not all free models are equal.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-fg-muted">
              Every model in the catalog is ranked by its <strong className="text-fg font-semibold">SWE-bench Verified score</strong> — the industry benchmark for real coding tasks. You choose the tier. The tool handles the rest.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-fg-muted">
              S+ models solve 70%+ of real GitHub issues. S and A tiers cover everyday coding. Filter by tier in the TUI or pass <code className="font-mono text-sm text-accent-fg bg-accent/10 px-1.5 py-0.5 rounded">--tier S</code> to the CLI.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { tier: 'S+', range: '70 %+',   desc: 'Frontier models. Complex refactors, agentic loops.' },
              { tier: 'S',  range: '60–70 %',  desc: 'Excellent general coding. Most tasks.' },
              { tier: 'A+', range: '50–60 %',  desc: 'Great alternatives with high throughput.' },
              { tier: 'A',  range: '40–50 %',  desc: 'Solid completions, quick edits.' },
              { tier: 'B+', range: '30–40 %',  desc: 'Lightweight models for constrained setups.' },
            ].map((row) => (
              <div key={row.tier} className="flex items-center gap-5 rounded-xl border border-[#1f2d0e] bg-[#111a08] px-6 py-4">
                <span className="w-10 shrink-0 font-mono text-lg font-black text-accent-fg">{row.tier}</span>
                <span className="w-20 shrink-0 font-mono text-xs text-fg-faint">{row.range}</span>
                <span className="font-mono text-sm text-fg-muted">{row.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Shell>
    </section>
  )
}

/* ── Integrations Section ─────────────────────────────────────────────────── */

function IntegrationsSection() {
  const integrations = [
    {
      icon: IconTerminal2,
      title: 'CLI & Terminal UI',
      desc: 'A full ANSI TUI with sorting, search, tier filtering and keybindings. Works in any terminal.',
      cmd: 'free-coding-models',
    },
    {
      icon: IconRocket,
      title: 'OpenCode',
      desc: 'Plug directly into OpenCode CLI. The best live model is injected automatically into your session.',
      cmd: 'free-coding-models --opencode',
    },
    {
      icon: IconBolt,
      title: 'OpenClaw & Hermes',
      desc: 'Route agentic loops through the best available free model. Transparent to the agent.',
      cmd: 'free-coding-models --openclaw',
    },
    {
      icon: IconBrandDocker,
      title: 'Docker API',
      desc: 'An OpenAI-compatible proxy on localhost:19280. Drop it in front of any tool that expects an API.',
      cmd: 'docker run free-coding-models',
    },
  ]

  return (
    <section className="border-b border-[#d2e49c] bg-[#f1f7e2] py-20 sm:py-28">
      <Shell>
        <div className="max-w-xl mb-14">
          <div className="flex items-center gap-2 mb-4">
            <IconServer2 size={16} className="text-[#5c7a00]" stroke={1.75} />
            <span className="font-mono text-xs font-bold text-[#5c7a00] uppercase tracking-wider">03 — Works everywhere</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900">
            One tool. Any workflow.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-700">
            Use it as a standalone TUI, embed it into your coding agent, or proxy any OpenAI-compatible tool through it.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {integrations.map(({ icon: Icon, title, desc, cmd }) => (
            <div key={title} className="rounded-2xl border border-[#d4e5a2] bg-white p-8 flex flex-col gap-5">
              <Icon size={28} className="text-[#8ab800]" stroke={1.5} />
              <div className="flex-1">
                <p className="text-lg font-semibold text-slate-900">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{desc}</p>
              </div>
              <code className="font-mono text-xs font-semibold text-[#5c7a00] bg-[#f4fce0] px-3 py-2 rounded-lg border border-[#d4e8a0] self-start">
                $ {cmd}
              </code>
            </div>
          ))}
        </div>

        {/* Pi Extension */}
        <div className="mt-6 rounded-2xl border border-[#c4e080] bg-white overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 p-8 lg:p-10">
              <div className="flex items-center gap-3 mb-5">
                <span className="rounded-full bg-[#c3ed06] px-3 py-1 font-mono text-[11px] font-bold text-[#0a0f02] border border-[#abcf04]">
                  Pi Extension
                </span>
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
                Native Pi IDE integration
              </h3>
              <p className="mt-4 text-base leading-relaxed text-slate-700 max-w-lg">
                Switch between 100+ free models without leaving your editor. The Pi extension adds an inline model picker, auto-failover, and tier filtering directly into your Pi sidebar — zero configuration required.
              </p>
              <code className="mt-6 inline-block font-mono text-xs font-bold text-[#5c7a00] bg-[#f4fce0] px-3 py-2 rounded-lg border border-[#d4e8a0]">
                $ free-coding-models --pi
              </code>
            </div>
            <div className="lg:w-64 bg-[#f5fae5] border-t lg:border-t-0 lg:border-l border-[#d4e5a2] p-8 flex flex-col justify-center gap-4">
              {[
                'Inline model picker',
                'Auto-failover',
                'Tier filter (S+ / S)',
                'Zero config',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-3">
                  <IconCheck size={18} className="text-[#5c7a00] shrink-0" stroke={2.5} />
                  <span className="text-sm font-semibold text-slate-900">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    </section>
  )
}

/* ── CTA ──────────────────────────────────────────────────────────────────── */

function CtaSection() {
  return (
    <section className="py-24 bg-bg">
      <Shell>
        <div className="rounded-2xl border border-accent/40 bg-[#0d1607] px-8 py-16 sm:px-16 text-center flex flex-col items-center shadow-[0_0_60px_rgba(195,237,6,0.1)]">
          <h2 className="text-3xl font-semibold tracking-tight text-fg sm:text-5xl">
            Start in 30 seconds.
          </h2>
          <p className="mt-5 max-w-md text-base text-fg-muted">
            One global install. No account. No API key required to get started.
          </p>

          <CopyCommand command={INSTALL_COMMAND} className="mt-10 max-w-md w-full" />

          <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
            <Link
              to="/docs/$"
              params={{ _splat: 'quick-start' }}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-mono text-sm font-bold text-ink shadow-[0_0_20px_rgba(195,237,6,0.25)] transition-transform hover:-translate-y-0.5"
            >
              <IconRocket size={16} stroke={2} />
              Read the docs
            </Link>
            <a
              href={site.repo}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 font-mono text-sm font-medium text-fg-muted hover:text-fg"
            >
              <IconBrandGithub size={16} stroke={1.75} />
              GitHub
            </a>
          </div>
        </div>
      </Shell>
    </section>
  )
}
