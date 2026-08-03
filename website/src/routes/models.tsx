/**
 * @file src/routes/models.tsx
 * @description `/models` — a live, sortable, filterable catalog of every free
 *   AI coding model the CLI can talk to. The data is imported directly from
 *   `../../../sources.js` (the same file the TUI and router-daemon use) so the
 *   page is always in sync — add a model to `sources.js` and it appears here
 *   on the next dev/build.
 *
 * @details
 *   Design language: mirrors the web dashboard at
 *   `web/src/components/dashboard/ModelTable.jsx` — accent-coloured sticky
 *   header, mono uppercase column labels, colour-coded SWE scores, medal
 *   borders for the top 3 ranked models, real provider logos + wordmarks.
 *
 *   The catalog is static (no live pings here) so the columns are scoped
 *   to what `sources.js` actually carries: Provider, Model, Tier, SWE%,
 *   Context, Quota + an "Open in CLI" affordance.
 *
 *   @exports Route
 */

import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  IconArrowsSort,
  IconArrowUp,
  IconArrowDown,
  IconSearch,
  IconX,
  IconFilter,
  IconExternalLink,
  IconServer,
  IconBolt,
  IconCopy,
  IconCheck,
  IconTerminal2,
} from '@tabler/icons-react'
import {
  type CatalogRow,
  type ProviderInfo,
  type Tier,
  type QuotaCode,
  TIERS,
  getCatalog,
  getProviders,
  getProviderCount,
  getTotalCount,
  tierAccent,
  quotaAccent,
  tierRank,
} from '~/lib/catalog'
import { site } from '~/lib/site'
import { ProviderLogo } from '~/components/ProviderLogo'
import { ModelsStructuredData } from '~/components/StructuredData'

export const Route = createFileRoute('/models')({
  loader: () => ({
    rows: getCatalog(),
    providers: getProviders(),
  }),
  head: () => ({
    meta: [
      { title: `Models Catalog — ${site.name}` },
      {
        name: 'description',
        content:
          'Live catalog of every free AI coding model the free-coding-models CLI can talk to — sorted by SWE-bench, filterable by tier and provider. Auto-generated from sources.js.',
      },
    ],
    links: [{ rel: 'canonical', href: `${site.url}/models` }],
  }),
  component: ModelsPage,
})

/* ── Sort plumbing ───────────────────────────────────────────────────────── */

type SortKey = 'rank' | 'tier' | 'swe' | 'ctx' | 'provider' | 'model' | 'quota'
type SortDir = 'asc' | 'desc'

const DEFAULT_SORT: { key: SortKey; dir: SortDir } = { key: 'rank', dir: 'desc' }

const QUOTA_RANK: Record<QuotaCode, number> = { free: 0, limited: 1, metered: 2 }

function compareRows(a: CatalogRow, b: CatalogRow, key: SortKey, dir: SortDir): number {
  // 📖 Returns negative when `a` should come first, positive when `b` should.
  // Numeric columns: `b - a` puts the higher value first by default (desc).
  // String columns: `localeCompare(a, b)` puts the alphabetically smaller
  // value first by default (asc) — so for desc we negate the result.
  switch (key) {
    case 'rank':
    case 'tier': {
      const tierDiff = tierRank(b.tier) - tierRank(a.tier)
      if (tierDiff !== 0) return dir === 'asc' ? -tierDiff : tierDiff
      // Tie-break by SWE within the same tier
      const sweDiff = b.sweValue - a.sweValue
      if (sweDiff !== 0) return dir === 'asc' ? -sweDiff : sweDiff
      return 0
    }
    case 'swe': {
      const diff = b.sweValue - a.sweValue
      if (diff !== 0) return dir === 'asc' ? -diff : diff
      return dir === 'asc' ? a.label.localeCompare(b.label) : -a.label.localeCompare(b.label)
    }
    case 'ctx': {
      const diff = b.ctxValue - a.ctxValue
      if (diff !== 0) return dir === 'asc' ? -diff : diff
      return dir === 'asc' ? a.label.localeCompare(b.label) : -a.label.localeCompare(b.label)
    }
    case 'provider': {
      const cmp = a.providerName.localeCompare(b.providerName)
      if (cmp !== 0) return dir === 'asc' ? cmp : -cmp
      const cmp2 = a.label.localeCompare(b.label)
      return dir === 'asc' ? cmp2 : -cmp2
    }
    case 'model': {
      const cmp = a.label.localeCompare(b.label)
      return dir === 'asc' ? cmp : -cmp
    }
    case 'quota': {
      const ra = QUOTA_RANK[a.providerQuotaCode] ?? 9
      const rb = QUOTA_RANK[b.providerQuotaCode] ?? 9
      const diff = ra - rb
      if (diff !== 0) return dir === 'asc' ? -diff : diff
      const cmp = a.providerName.localeCompare(b.providerName)
      return dir === 'asc' ? cmp : -cmp
    }
  }
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** 📖 Medal rank within the *currently visible* models. Top 3 S+ tier
 *  models get gold/silver/bronze left borders regardless of pagination. */
function medalFor(sorted: CatalogRow[], index: number): 'gold' | 'silver' | 'bronze' | null {
  if (index > 2) return null
  // Only award medals to S+ / S tier rows (the ones a user would actually "rank")
  if (tierRank(sorted[index]?.tier ?? 'C') < tierRank('S')) return null
  return (['gold', 'silver', 'bronze'] as const)[index] ?? null
}

/** 📖 Maps a SWE score to a colour-coded class — mirrors the TUI/web/ palette
 *  so the user gets the same visual cue across all surfaces. */
function sweClass(swe: number): { color: string; label: string } {
  if (swe < 0) return { color: 'text-fg-faint', label: '—' }
  if (swe >= 70) return { color: 'text-[#ffd700]', label: `${swe.toFixed(1)}%` }
  if (swe >= 50) return { color: 'text-[#3ddc84]', label: `${swe.toFixed(1)}%` }
  if (swe >= 30) return { color: 'text-[#7ecf7e]', label: `${swe.toFixed(1)}%` }
  return { color: 'text-fg-faint', label: `${swe.toFixed(1)}%` }
}

/* ── Main page ───────────────────────────────────────────────────────────── */

function ModelsPage() {
  const { rows, providers } = Route.useLoaderData() as {
    rows: CatalogRow[]
    providers: ProviderInfo[]
  }

  const [query, setQuery] = useState('')
  const [activeTiers, setActiveTiers] = useState<Set<Tier>>(new Set())
  const [activeProvider, setActiveProvider] = useState<string>('all')
  const [activeQuota, setActiveQuota] = useState<QuotaCode | 'all'>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>(DEFAULT_SORT)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (activeTiers.size > 0 && !activeTiers.has(r.tier)) return false
      if (activeProvider !== 'all' && r.providerKey !== activeProvider) return false
      if (activeQuota !== 'all' && r.providerQuotaCode !== activeQuota) return false
      if (q) {
        const hay = `${r.label} ${r.modelId} ${r.providerName} ${r.tier}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, query, activeTiers, activeProvider, activeQuota])

  const sorted = useMemo(() => {
    const copy = filtered.slice()
    copy.sort((a, b) => compareRows(a, b, sort.key, sort.dir))
    return copy
  }, [filtered, sort])

  const stats = useMemo(() => {
    const tierCounts: Record<string, number> = {}
    for (const r of sorted) tierCounts[r.tier] = (tierCounts[r.tier] || 0) + 1
    return {
      total: getTotalCount(),
      visible: sorted.length,
      providers: getProviderCount(),
      sPlus: tierCounts['S+'] || 0,
      s: tierCounts['S'] || 0,
      free: sorted.filter((r) => r.providerQuotaCode === 'free').length,
    }
  }, [sorted])

  const toggleTier = (tier: Tier) => {
    setActiveTiers((prev) => {
      const next = new Set(prev)
      if (next.has(tier)) next.delete(tier)
      else next.add(tier)
      return next
    })
  }

  const clearFilters = () => {
    setQuery('')
    setActiveTiers(new Set())
    setActiveProvider('all')
    setActiveQuota('all')
  }

  const hasFilters = query !== '' || activeTiers.size > 0 || activeProvider !== 'all' || activeQuota !== 'all'

  const handleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      const defaultDir: SortDir = key === 'tier' || key === 'swe' || key === 'ctx' || key === 'rank' ? 'desc' : 'asc'
      return { key, dir: defaultDir }
    })
  }

  return (
    <>
      <ModelsStructuredData total={stats.total} providers={stats.providers} />
      <article className="mx-auto max-w-[1500px] px-3 py-8 sm:px-6 sm:py-12">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <header className="mb-6 px-2">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent-fg">
              <IconServer size={12} stroke={2} />
              Live catalog
            </span>
            <span className="hidden font-mono text-[11px] text-fg-faint sm:inline">
              Auto-generated from{' '}
              <Link
                to="/docs/$"
                params={{ _splat: 'core/providers' }}
                className="rounded bg-bg-subtle px-1.5 py-0.5 text-fg-muted hover:text-fg"
              >
                sources.js
              </Link>
            </span>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-4xl">
                Every free AI coding model.{' '}
                <span className="text-fg-muted">Sorted, filtered, always current.</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
                {stats.total} free models across {stats.providers} providers — ranked by SWE-bench Verified,
                scoped by tier, filterable by provider. The list rebuilds itself from{' '}
                <Link
                  to="/docs/$"
                  params={{ _splat: 'core/providers' }}
                  className="text-fg underline decoration-accent decoration-2 underline-offset-4 hover:bg-accent/15"
                >
                  sources.js
                </Link>{' '}
                so it&apos;s never out of date.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatPill label="models" value={stats.visible} hint={`of ${stats.total}`} />
              <StatPill label="providers" value={stats.providers} />
              <StatPill label="S+" value={stats.sPlus} accent />
              <StatPill label="free" value={stats.free} accent />
            </div>
          </div>
        </header>

        {/* ── Filter bar (sticky) ──────────────────────────────────────── */}
        <div className="sticky top-14 z-30 -mx-3 mb-4 border-y border-border bg-bg/90 px-3 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <IconSearch
                size={15}
                stroke={1.75}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-faint"
              />
              <input
                type="search"
                inputMode="search"
                placeholder="Search model, id, or provider…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded border border-border bg-bg-raised py-1.5 pl-8 pr-8 font-mono text-xs text-fg placeholder:text-fg-faint focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
                aria-label="Search models"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-fg-faint transition-colors hover:bg-bg-subtle hover:text-fg"
                  aria-label="Clear search"
                >
                  <IconX size={12} stroke={2} />
                </button>
              )}
            </div>

            {/* Tier chips */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="hidden font-mono text-[10px] uppercase tracking-widest text-fg-faint sm:inline">
                Tier:
              </span>
              {TIERS.map((tier) => {
                const active = activeTiers.has(tier)
                const accent = tierAccent(tier)
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => toggleTier(tier)}
                    className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors ${
                      active
                        ? `${accent.text} ${accent.bg} ${accent.border}`
                        : 'border-border bg-bg-raised text-fg-faint hover:border-border-strong hover:text-fg'
                    }`}
                    aria-pressed={active}
                  >
                    {tier}
                  </button>
                )
              })}
            </div>

            {/* Quota quick-filter */}
            <div className="flex items-center gap-1">
              <span className="hidden font-mono text-[10px] uppercase tracking-widest text-fg-faint sm:inline">
                Quota:
              </span>
              {(['all', 'free', 'limited', 'metered'] as const).map((code) => {
                const active = activeQuota === code
                const palette = code === 'all' ? null : quotaAccent(code)
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setActiveQuota(code)}
                    className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      active
                        ? palette
                          ? `${palette.text} ${palette.bg} ${palette.border}`
                          : 'border-accent/40 bg-accent/15 text-accent-fg'
                        : 'border-border bg-bg-raised text-fg-faint hover:border-border-strong hover:text-fg'
                    }`}
                    aria-pressed={active}
                  >
                    {code}
                  </button>
                )
              })}
            </div>

            {/* Provider select */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="provider-select"
                className="hidden font-mono text-[10px] uppercase tracking-widest text-fg-faint sm:inline"
              >
                Provider:
              </label>
              <select
                id="provider-select"
                value={activeProvider}
                onChange={(e) => setActiveProvider(e.target.value)}
                className="min-w-[10rem] rounded border border-border bg-bg-raised px-2 py-1 font-mono text-xs text-fg focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
              >
                <option value="all">All providers</option>
                {providers.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name} ({p.modelCount})
                  </option>
                ))}
              </select>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded border border-border bg-bg-raised px-2 py-0.5 font-mono text-[10px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                >
                  <IconFilter size={11} stroke={1.75} />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-lg border border-border bg-bg-card">
          <div className="max-h-[72vh] overflow-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-accent">
                <tr className="text-left text-ink">
                  <Th
                    onClick={() => handleSort('rank')}
                    active={sort.key === 'rank'}
                    dir={sort.dir}
                    className="w-[5%] text-center"
                    align="center"
                    title="Rank — by tier then SWE-bench score"
                  >
                    #
                  </Th>
                  <Th
                    onClick={() => handleSort('tier')}
                    active={sort.key === 'tier'}
                    dir={sort.dir}
                    className="w-[8%] text-center"
                    align="center"
                  >
                    Tier
                  </Th>
                  <Th
                    onClick={() => handleSort('model')}
                    active={sort.key === 'model'}
                    dir={sort.dir}
                    className="w-[28%]"
                  >
                    Model
                  </Th>
                  <Th
                    onClick={() => handleSort('provider')}
                    active={sort.key === 'provider'}
                    dir={sort.dir}
                    className="w-[18%]"
                  >
                    Provider
                  </Th>
                  <Th
                    onClick={() => handleSort('swe')}
                    active={sort.key === 'swe'}
                    dir={sort.dir}
                    className="w-[10%] text-right"
                    align="right"
                  >
                    SWE%
                  </Th>
                  <Th
                    onClick={() => handleSort('ctx')}
                    active={sort.key === 'ctx'}
                    dir={sort.dir}
                    className="w-[8%] text-right"
                    align="right"
                  >
                    CTX
                  </Th>
                  <Th
                    onClick={() => handleSort('quota')}
                    active={sort.key === 'quota'}
                    dir={sort.dir}
                    className="w-[18%]"
                  >
                    Quota
                  </Th>
                  <th
                    scope="col"
                    className="w-[5%] px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-widest"
                    aria-label="Quick action"
                  >
                    <span aria-hidden="true">⎘</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <Row key={row.key} row={row} rank={i + 1} medal={medalFor(sorted, i)} />
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <p className="font-mono text-sm text-fg-muted">No models match your filters.</p>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-3 inline-flex items-center gap-1.5 rounded border border-border bg-bg-raised px-3 py-1.5 font-mono text-xs text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                      >
                        <IconFilter size={12} stroke={1.75} />
                        Reset filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-bg/60 px-3 py-2 font-mono text-[10px] text-fg-faint">
            <span>
              Showing <span className="text-fg">{sorted.length}</span> of <span className="text-fg">{rows.length}</span>{' '}
              models
              {hasFilters && (
                <span className="ml-2 inline-flex items-center gap-1 text-accent-fg">
                  <IconBolt size={10} stroke={2} />
                  filtered
                </span>
              )}
            </span>
            <span className="hidden sm:inline">
              Click any column to sort · Click again to reverse · ⎘ copies the CLI snippet
            </span>
          </div>
        </div>

        {/* ── Mobile cards (visible only on small screens) ─────────────── */}
        <div className="mt-4 grid gap-3 sm:hidden">
          {sorted.map((row, i) => (
            <MobileCard key={row.key} row={row} rank={i + 1} />
          ))}
        </div>
      </article>
    </>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function StatPill({ label, value, hint, accent }: { label: string; value: number; hint?: string; accent?: boolean }) {
  return (
    <div
      className={`inline-flex items-baseline gap-1.5 rounded border px-2.5 py-1 font-mono ${
        accent
          ? 'border-accent/40 bg-accent/10 text-accent-fg'
          : 'border-border bg-bg-raised text-fg'
      }`}
    >
      <span className="text-sm font-bold tabular-nums">{value}</span>
      <span className="text-[10px] text-fg-faint">{label}</span>
      {hint && <span className="text-[10px] text-fg-faint">{hint}</span>}
    </div>
  )
}

function Th({
  children,
  onClick,
  active,
  dir,
  className = '',
  align = 'left',
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  dir: SortDir
  className?: string
  align?: 'left' | 'right' | 'center'
  title?: string
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 ${className}`}
      title={title}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex w-full items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
          active ? 'text-ink' : 'text-ink/80 hover:text-ink'
        } ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}
      >
        {children}
        {active ? (
          dir === 'asc' ? (
            <IconArrowUp size={11} stroke={2.5} />
          ) : (
            <IconArrowDown size={11} stroke={2.5} />
          )
        ) : (
          <IconArrowsSort size={11} stroke={2} className="opacity-40" />
        )}
      </button>
    </th>
  )
}

/* ── A single row ────────────────────────────────────────────────────────── */

function Row({ row, rank, medal }: { row: CatalogRow; rank: number; medal: 'gold' | 'silver' | 'bronze' | null }) {
  const tier = tierAccent(row.tier)
  const quota = quotaAccent(row.providerQuotaCode)
  const swe = sweClass(row.sweValue)
  const borderClass =
    medal === 'gold'
      ? 'border-l-[3px] border-l-[#ffd700]'
      : medal === 'silver'
        ? 'border-l-[3px] border-l-[#c0c0c0]'
        : medal === 'bronze'
          ? 'border-l-[3px] border-l-[#cd7f32]'
          : 'border-l-[3px] border-l-transparent'

  return (
    <tr className={`group border-b border-border/60 transition-colors hover:bg-bg-hover ${borderClass}`}>
      {/* Rank */}
      <td className="px-3 py-2 text-center align-middle font-mono text-[11px] font-bold text-fg-faint tabular-nums">
        {rank}
      </td>

      {/* Tier */}
      <td className="px-3 py-2 text-center align-middle">
        <span
          className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold ${tier.text} ${tier.bg} ${tier.border}`}
          title={tierTooltip(row.tier)}
        >
          {row.tier}
        </span>
      </td>

      {/* Model */}
      <td className="px-3 py-2 align-middle">
        <p className="truncate text-[13px] font-semibold text-fg" title={row.label}>
          {row.label}
        </p>
        <p className="truncate font-mono text-[10px] text-fg-faint" title={row.modelId}>
          {row.modelId}
        </p>
      </td>

      {/* Provider */}
      <td className="px-3 py-2 align-middle">
        <ProviderLogo providerKey={row.providerKey} providerName={row.providerName} size={18} />
      </td>

      {/* SWE */}
      <td className="px-3 py-2 text-right align-middle">
        <span className={`font-mono text-[12px] font-semibold tabular-nums ${swe.color}`}>
          {swe.label}
        </span>
      </td>

      {/* Context */}
      <td className="px-3 py-2 text-right align-middle">
        <span className="font-mono text-[12px] tabular-nums text-fg-muted">
          {row.ctxValue > 0 ? row.ctxLabel : '—'}
        </span>
      </td>

      {/* Quota */}
      <td className="px-3 py-2 align-middle">
        <div className="flex flex-col gap-0.5">
          <span
            className={`inline-flex w-fit items-center rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${quota.text} ${quota.bg} ${quota.border}`}
          >
            {quotaLabel(row.providerQuotaCode)}
          </span>
          <p className="truncate font-mono text-[10px] text-fg-muted" title={row.providerQuota}>
            {row.providerQuota}
          </p>
        </div>
      </td>

      {/* Quick action — copy the CLI launch snippet */}
      <td className="px-2 py-2 text-center align-middle">
        <CopyCommandButton providerKey={row.providerKey} modelId={row.modelId} />
      </td>
    </tr>
  )
}

/* ── Copy-to-clipboard CLI snippet button ────────────────────────────────── */

function CopyCommandButton({ providerKey, modelId }: { providerKey: string; modelId: string }) {
  const [copied, setCopied] = useState(false)
  // 📖 Mirrors the TUI's `--pick` flag: pre-pins a specific model so users can
  // quickly try it without going through the picker. The OpenCode mode is the
  // most common workflow, so we default to that.
  const cmd = `npx free-coding-models --pick ${providerKey}/${modelId} --tool opencode`

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(cmd)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      // noop — clipboard might be blocked in some sandboxes
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Copy CLI command:\n${cmd}`}
      className={`inline-flex items-center justify-center rounded border px-1.5 py-1 transition-colors ${
        copied
          ? 'border-accent/60 bg-accent/15 text-accent-fg'
          : 'border-border bg-bg-raised text-fg-faint hover:border-accent/40 hover:bg-accent/10 hover:text-accent-fg'
      }`}
      aria-label={`Copy CLI command for ${modelId}`}
    >
      {copied ? <IconCheck size={12} stroke={2.5} /> : <IconCopy size={12} stroke={1.75} />}
    </button>
  )
}

/* ── Mobile card layout (hidden on sm+) ──────────────────────────────────── */

function MobileCard({ row, rank }: { row: CatalogRow; rank: number }) {
  const tier = tierAccent(row.tier)
  const quota = quotaAccent(row.providerQuotaCode)
  const swe = sweClass(row.sweValue)
  return (
    <div className="rounded-lg border border-border bg-bg-subtle/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">
            <span className="mr-1 font-mono text-[10px] text-fg-faint">#{rank}</span>
            {row.label}
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-fg-faint">{row.modelId}</p>
        </div>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold ${tier.text} ${tier.bg} ${tier.border}`}
        >
          {row.tier}
        </span>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 font-mono text-[11px]">
        <ProviderLogo providerKey={row.providerKey} providerName={row.providerName} size={16} showWordmark={false} />
        <span className={`font-semibold tabular-nums ${swe.color}`}>SWE {swe.label}</span>
        <span className="text-fg-muted">CTX {row.ctxValue > 0 ? row.ctxLabel : '—'}</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span
          className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${quota.text} ${quota.bg} ${quota.border}`}
        >
          {quotaLabel(row.providerQuotaCode)}
        </span>
        <p className="truncate font-mono text-[10px] text-fg-faint">{row.providerQuota}</p>
      </div>
    </div>
  )
}

/* ── Small util renderers ───────────────────────────────────────────────── */

function tierTooltip(tier: Tier): string {
  switch (tier) {
    case 'S+':
      return 'S+ · ≥70% SWE-bench Verified (elite)'
    case 'S':
      return 'S · 60–70% (excellent)'
    case 'A+':
      return 'A+ · 50–60% (great)'
    case 'A':
      return 'A · 40–50% (good)'
    case 'A-':
      return 'A- · 35–40% (decent)'
    case 'B+':
      return 'B+ · 30–35% (average)'
    case 'B':
      return 'B · 20–30% (below average)'
    case 'C':
      return 'C · <20% (lightweight / edge)'
  }
}

function quotaLabel(code: QuotaCode): string {
  switch (code) {
    case 'free':
      return 'Free'
    case 'limited':
      return 'Limited'
    case 'metered':
      return 'Metered'
  }
}
