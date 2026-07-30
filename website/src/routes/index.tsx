/**
 * @file src/routes/index.tsx
 * @description The landing page for free-coding-models.
 * Five numbered sections present the project, tier system, health checks,
 * universal surfaces, provider ecosystem, and quick start CTA.
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { CodeWindow } from '~/components/CodeWindow'
import { CopyCommand } from '~/components/CopyCommand'
import { INSTALL_COMMAND, site } from '~/lib/site'
import HeroGeometric from '~/components/HeroGeometric'
import { Video } from '~/components/Video'
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
      <TierSection />
      <FailoverSection />
      <SurfacesSection />
      <ProvidersSection />
      <CtaSection />
    </>
  )
}

function Shell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>
}

function Section({
  index,
  eyebrow,
  title,
  lead,
  children,
}: {
  index: string
  eyebrow: string
  title: string
  lead: string
  children?: React.ReactNode
}) {
  return (
    <section className="border-b border-border py-16 sm:py-24">
      <Shell>
        <div className="mb-12 max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="section-index">{index}</span>
            <span className="label">{eyebrow}</span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-fg sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-fg-muted">
            {lead}
          </p>
        </div>
        {children}
      </Shell>
    </section>
  )
}

/* ── Hero Section ───────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative border-b border-border overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <HeroGeometric color1="#10b981" color2="#09090b" speed={1.5} className="w-full h-full min-h-[620px]" />
      </div>
      <Shell className="relative z-10">
        <div className="py-16 sm:py-24 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-accent/15 px-3 py-1 font-mono text-xs font-semibold text-accent-fg border border-accent/30">
                100% Free · Open Source · Zero Config
              </span>
            </div>

            <h1 className="animate-rise mt-6 text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-[4rem]">
              Free AI coding models,
              <br />
              built for every{' '}
              <span className="bg-accent px-2 text-ink rounded">assistant</span>.
            </h1>

            <p className="animate-rise mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-fg-muted">
              Stop paying monthly subscriptions for code completion. Aggregate 100+ free AI coding models across Google Gemini, DeepSeek, Groq, Cerebras, and local Ollama with automatic failover and SWE-bench ranking.
            </p>

            <div className="animate-rise mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                to="/docs/$"
                params={{ _splat: 'quick-start' }}
                className="group inline-flex items-center gap-2 self-start rounded-md bg-accent px-4 py-2.5 font-mono text-[14px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
              >
                Quick Start Guide
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <a
                href={site.repo}
                target="_blank"
                rel="noreferrer noopener"
                className="group inline-flex items-center gap-2 self-start font-mono text-[14px] font-medium text-fg-muted transition-colors hover:text-fg"
              >
                GitHub Repository ↗
              </a>
            </div>

            <div className="animate-rise mt-6 max-w-xl border-l-2 border-accent pl-3.5 font-mono text-[12.5px] leading-relaxed text-fg-muted">
              <p className="font-semibold text-fg">Continuous Health Checks · Instant Failover</p>
              <p className="mt-1">
                Runs seamlessly in terminal TUI, desktop menu bar tray, OpenCode CLI, or local Docker proxy on port 19280.
              </p>
            </div>
          </div>

          <div className="animate-rise w-full max-w-[26rem] shrink-0 self-center lg:self-auto">
            <CometCard className="w-full">
              <div className="hero-card-surface rounded-2xl border border-border/80 p-8 backdrop-blur-md">
                <Video name="tui-first-launch" caption="First launch — ~222 models ping in parallel." />
                <CopyCommand command={INSTALL_COMMAND} className="mt-6 w-full" />
              </div>
            </CometCard>
          </div>
        </div>

        <dl className="animate-rise mt-12 grid gap-px border-y border-border bg-border sm:grid-cols-3">
          {[
            ['100+ Free Models', 'Google Gemini, DeepSeek R1, Groq, Cerebras, Together, Sambanova & local Ollama.'],
            ['Auto-Failover Engine', 'Continuous latency pinging and instant rate-limit fallback across providers.'],
            ['SWE-Bench Scoring', 'Categorized into S+, S, A+, A tiers by real-world coding benchmark quality.'],
          ].map(([term, detail]) => (
            <div key={term} className="bg-bg py-5 sm:px-6">
              <dt className="label text-accent-fg">{term}</dt>
              <dd className="mt-1.5 font-mono text-[13px] leading-relaxed text-fg-muted">{detail}</dd>
            </div>
          ))}
        </dl>
      </Shell>
    </section>
  )
}

/* ── Section 01: Tier System ─────────────────────────────────────────────── */

function TierSection() {
  const tiers = [
    { name: 'S+ Tier', model: 'DeepSeek-V3 / Gemini 2.5 Pro', score: '51.2%', context: '1,000,000', status: 'OPERATIONAL' },
    { name: 'S Tier', model: 'Gemini 2.5 Flash / Qwen 2.5 Coder 32B', score: '44.8%', context: '1,000,000', status: 'OPERATIONAL' },
    { name: 'A+ Tier', model: 'DeepSeek R1 Distill 70B / Llama 3.3 70B', score: '39.4%', context: '128,000', status: 'OPERATIONAL' },
    { name: 'A Tier', model: 'Codestral 22B / Qwen 2.5 Coder 14B', score: '35.1%', context: '32,000', status: 'OPERATIONAL' },
  ]

  return (
    <Section
      index="01"
      eyebrow="Tier System & Benchmarks"
      title="Categorized by real-world coding performance"
      lead="Never guess which model works best for complex refactoring versus quick edits. All models are automatically scored by SWE-bench capability, latency, and context window size."
    >
      <div className="overflow-x-auto rounded-xl border border-border bg-bg-raised">
        <table className="w-full text-left font-mono text-xs">
          <thead className="border-b border-border bg-bg-subtle uppercase text-fg-faint">
            <tr>
              <th className="px-5 py-3.5">Tier</th>
              <th className="px-5 py-3.5">Top Model Representative</th>
              <th className="px-5 py-3.5">SWE Score</th>
              <th className="px-5 py-3.5">Context Window</th>
              <th className="px-5 py-3.5">Condition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tiers.map((row) => (
              <tr key={row.name} className="hover:bg-bg-subtle/50 transition-colors">
                <td className="px-5 py-4 font-semibold text-accent-fg">{row.name}</td>
                <td className="px-5 py-4 text-fg font-medium">{row.model}</td>
                <td className="px-5 py-4 text-fg-muted">{row.score}</td>
                <td className="px-5 py-4 text-fg-muted">{row.context} tokens</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold text-accent-fg border border-accent/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

/* ── Section 02: Failover Engine ─────────────────────────────────────────── */

function FailoverSection() {
  return (
    <Section
      index="02"
      eyebrow="Failover Engine"
      title="Never hit a quota wall during coding sessions"
      lead="Free tiers have rate limits. free-coding-models continuously monitors provider endpoints, detecting HTTP 429 quota exhaustion instantly and switching to the next operational model in under 100ms."
    >
      <CodeWindow
        tabs={[
          {
            id: 'cli',
            label: 'CLI Best Selection',
            filename: 'free-coding-models --best',
            content: `[INFO] Pinging catalog across 8 free providers...
[PING] gemini-2.5-pro ....... 420ms [200 OK] (Tier S+)
[PING] deepseek-r1-70b ...... 180ms [200 OK] (Tier S)
[PING] groq-llama-3.3-70b ... 95ms  [200 OK] (Tier A+)
[SELECT] Best active model: gemini-2.5-pro (SWE 51.2%, 1M ctx)`,
          },
          {
            id: 'failover',
            label: 'Auto Failover Log',
            filename: 'failover-daemon.log',
            content: `[12:24:02] REQUEST -> gemini-2.5-pro
[12:24:02] WARN -> HTTP 429 ResourceExhausted (rate limit hit)
[12:24:02] FAILOVER -> switching to deepseek-r1-70b (Tier S)
[12:24:03] SUCCESS -> Response received in 340ms (Zero session disruption)`,
          },
        ]}
      />
      <div className="mt-8">
        <Video name="router-playground" caption="Playground — chat with the router and see the routed provider/model on the reply." />
      </div>
    </Section>
  )
}

/* ── Section 03: Universal Compatibility ─────────────────────────────────── */

function SurfacesSection() {
  const surfaces = [
    { title: 'CLI & Terminal UI', desc: 'Raw ANSI TUI with keybindings, tmux integration, sorting, and search.' },
    { title: 'Desktop Tray App', desc: 'Native Tauri system tray menu bar app with one-click model switcher.' },
    { title: 'OpenCode Plugin', desc: 'Direct plugin integration with OpenCode CLI coding assistant.' },
    { title: 'OpenClaw Integration', desc: 'Seamlessly patch models into OpenClaw autonomous workflows.' },
    { title: 'Local Docker Server', desc: 'Lightweight API daemon running on localhost:19280.' },
    { title: 'Ollama & Local GGUF', desc: 'Integrate custom local endpoints alongside cloud free tiers.' },
  ]

  return (
    <Section
      index="03"
      eyebrow="Universal Compatibility"
      title="One catalog across all developer environments"
      lead="Whether you work in the terminal, IDE, desktop tray, or custom agent scripts, free-coding-models provides a unified interface."
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {surfaces.map((s) => (
          <div key={s.title} className="rounded-xl border border-border bg-bg-raised p-6 hover:border-border-strong transition-colors">
            <p className="font-mono text-sm font-semibold text-fg">{s.title}</p>
            <p className="mt-2 font-mono text-xs leading-relaxed text-fg-muted">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <p className="label mb-4">See it live</p>
        <div className="grid gap-6 lg:grid-cols-3">
          <Video name="tui-pick-and-launch" caption="Pick a model & launch — Enter writes the model and opens the tool." />
          <Video name="tui-speed-test" caption="AI Speed Test — Ctrl+A benchmarks the selected model." />
          <Video name="web-url-deep-linking" caption="URL deep-linking — filter the dashboard, share the URL." />
        </div>
      </div>
    </Section>
  )
}

/* ── Section 04: Provider Network ────────────────────────────────────────── */

function ProvidersSection() {
  const providers = [
    { name: 'Google AI Studio', desc: 'Gemini 2.5 Flash & Pro free tiers' },
    { name: 'Groq', desc: 'Ultra-fast Llama 3.3 70B & DeepSeek R1' },
    { name: 'Cerebras', desc: 'World fastest inference engine' },
    { name: 'HuggingFace', desc: 'Open-source community endpoints' },
    { name: 'Together AI', desc: 'Free trial and community models' },
    { name: 'Sambanova', desc: 'Full speed Qwen 2.5 & Llama 3.3' },
    { name: 'Mistral AI', desc: 'Codestral developer endpoints' },
    { name: 'Ollama Local', desc: 'Your machine GGUF models' },
  ]

  return (
    <Section
      index="04"
      eyebrow="Free Provider Network"
      title="All major free inference providers in one unified catalog"
      lead="No locked-in API keys. Configure keys once in ~/.free-coding-models/config.json or via the TUI Settings menu."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {providers.map((p) => (
          <div key={p.name} className="rounded-lg border border-border bg-bg-subtle p-4">
            <p className="font-mono text-xs font-semibold text-accent-fg">{p.name}</p>
            <p className="mt-1 font-mono text-[11px] text-fg-muted">{p.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ── Section 05: Installation CTA ────────────────────────────────────────── */

function CtaSection() {
  return (
    <section className="py-20">
      <Shell>
        <div className="rounded-2xl border border-border bg-bg-raised p-8 sm:p-12 text-center flex flex-col items-center">
          <span className="section-index mb-2">05 · Quick Install</span>
          <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-4xl">
            Start coding with free models in seconds
          </h2>
          <p className="mt-4 max-w-lg text-sm text-fg-muted">
            Install globally with npm or pnpm. Free, open source, and fully local control.
          </p>

          <CopyCommand command={INSTALL_COMMAND} className="mt-8 max-w-md w-full" />

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/docs/$"
              params={{ _splat: 'quick-start' }}
              className="rounded-md bg-accent px-4 py-2 font-mono text-xs font-semibold text-ink transition-transform hover:-translate-y-0.5"
            >
              Read Quick Start Docs →
            </Link>
            <a
              href={site.repo}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-xs font-medium text-fg-muted hover:text-fg"
            >
              View GitHub Repo ↗
            </a>
          </div>
        </div>
      </Shell>
    </section>
  )
}
