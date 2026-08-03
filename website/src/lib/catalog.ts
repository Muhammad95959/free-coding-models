/**
 * @file src/lib/catalog.ts
 * @description Dynamic loader & enrichment for the model catalog.
 *
 * @details
 *   `sources.js` is the single source of truth for every free model the
 *   free-coding-models CLI can talk to. The website imports it directly so
 *   the public catalog is always in sync with the package — add a model to
 *   `sources.js` and it shows up here on the next dev/build, no copy step.
 *
 *   This module is intentionally small: it flattens the provider map into a
 *   stable row shape, parses the human-friendly strings (`82.8%`, `1M`) into
 *   numbers so the table can sort by them, and exports a couple of helpers
 *   the `/models` route uses for tier colour + filter UI.
 *
 *   📖 Why a separate file and not inline in the route?
 *   - The route component stays focused on rendering; all the parsing lives
 *     here, where it's easy to unit-test and reuse (e.g. a future RSS feed
 *     or sitemap could call the same `getCatalog()`).
 *   - Vite tree-shakes the route on production builds, but the data is
 *     static so we keep it lightweight regardless.
 *
 *   @exports Tier, TierCode, QuotaCode, CatalogRow, ProviderInfo, getCatalog, getProviders, tierRank, formatCtx, formatSwe, tierAccent
 */

import { sources as rawSources, MODELS as rawModels } from 'fcm-sources'

/* ── Public types ────────────────────────────────────────────────────────── */

export type Tier = 'S+' | 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'C'
export const TIERS: readonly Tier[] = ['S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'C'] as const

export type QuotaCode = 'free' | 'limited' | 'metered'

export type ProviderInfo = {
  key: string
  name: string
  url: string
  quota: string
  quotaCode: QuotaCode
  modelCount: number
  noKeyNeeded: boolean
  zenOnly: boolean
}

export type CatalogRow = {
  /** Unique key — `${providerKey}::${modelId}` so two providers can expose
   *  the same modelId (e.g. `gpt-oss-120b` shows up on nvidia, groq, openrouter, …) */
  key: string
  providerKey: string
  providerName: string
  providerUrl: string
  providerQuota: string
  providerQuotaCode: QuotaCode
  modelId: string
  label: string
  tier: Tier
  /** 0–100, useful for sorting. `-1` when the provider never published a score. */
  sweValue: number
  /** Original "82.8%" string. `"—"` when unknown. */
  sweLabel: string
  /** Context window in tokens, or 0 when unknown. */
  ctxValue: number
  /** Original "128k" / "1M" / "—". */
  ctxLabel: string
  /** Optional ISO date the model was first added to `sources.js`. */
  addedDate: string | null
}

/* ── Parsing helpers ─────────────────────────────────────────────────────── */

/** 📖 SWE-bench scores are written as "82.8%" or "-" (unknown). Returning -1
 *  keeps unknown models at the bottom of any "best score first" sort. */
function parseSwe(raw: unknown): { value: number; label: string } {
  if (typeof raw !== 'string' || raw === '-' || raw === '') {
    return { value: -1, label: '—' }
  }
  const num = Number.parseFloat(raw.replace('%', '').trim())
  if (!Number.isFinite(num)) return { value: -1, label: '—' }
  return { value: num, label: raw.trim() }
}

/** 📖 Context windows come in as "1M", "256k", "32k", "16k" or "-". We parse
 *  to raw token count for sorting and keep the original string for display. */
function parseCtx(raw: unknown): { value: number; label: string } {
  if (typeof raw !== 'string' || raw === '-' || raw === '') {
    return { value: 0, label: '—' }
  }
  const m = raw.trim().match(/^([\d.]+)\s*([kKmM]?)$/)
  if (!m) return { value: 0, label: raw.trim() }
  const n = Number.parseFloat(m[1] ?? '0')
  const unit = (m[2] ?? '').toLowerCase()
  const mul = unit === 'm' ? 1_000_000 : unit === 'k' ? 1_000 : 1
  return { value: Math.round(n * mul), label: raw.trim() }
}

/** 📖 Map each tier to a numeric rank so we can sort descending (S+ > S > A+ > …).
 *  Numbers are spaced (100, 90, 80, …) so we can later insert intermediate tiers
 *  (e.g. "A+2") without reshuffling the whole scale. */
export function tierRank(tier: string): number {
  const map: Record<string, number> = {
    'S+': 100,
    S: 90,
    'A+': 80,
    A: 70,
    'A-': 65,
    'B+': 60,
    B: 50,
    C: 40,
  }
  return map[tier] ?? 0
}

/* ── Provider + row builders ─────────────────────────────────────────────── */

type RawSource = {
  name?: unknown
  url?: unknown
  quota?: unknown
  quotaCode?: unknown
  models?: unknown
  noKeyNeeded?: unknown
  zenOnly?: unknown
}

function normalizeProvider(key: string, raw: RawSource): ProviderInfo {
  const models = Array.isArray(raw.models) ? raw.models : []
  return {
    key,
    name: typeof raw.name === 'string' ? raw.name : key,
    url: typeof raw.url === 'string' ? raw.url : '',
    quota: typeof raw.quota === 'string' ? raw.quota : 'Free tier',
    quotaCode:
      raw.quotaCode === 'metered' || raw.quotaCode === 'limited' ? raw.quotaCode : 'free',
    modelCount: models.length,
    noKeyNeeded: raw.noKeyNeeded === true,
    zenOnly: raw.zenOnly === true,
  }
}

function buildRows(providers: Map<string, ProviderInfo>): CatalogRow[] {
  const rows: CatalogRow[] = []
  for (const m of rawModels) {
    if (!Array.isArray(m) || m.length < 6) continue
    const [modelId, label, tierRaw, sweRaw, ctxRaw, sourceKeyRaw, addedDateRaw] = m
    if (typeof modelId !== 'string' || typeof label !== 'string') continue
    if (typeof sourceKeyRaw !== 'string') continue
    const provider = providers.get(sourceKeyRaw)
    if (!provider) continue
    const tier = (typeof tierRaw === 'string' ? tierRaw : 'C') as Tier
    const swe = parseSwe(sweRaw)
    const ctx = parseCtx(ctxRaw)
    rows.push({
      key: `${sourceKeyRaw}::${modelId}`,
      providerKey: sourceKeyRaw,
      providerName: provider.name,
      providerUrl: provider.url,
      providerQuota: provider.quota,
      providerQuotaCode: provider.quotaCode,
      modelId,
      label,
      tier,
      sweValue: swe.value,
      sweLabel: swe.label,
      ctxValue: ctx.value,
      ctxLabel: ctx.label,
      addedDate: typeof addedDateRaw === 'string' ? addedDateRaw : null,
    })
  }
  return rows
}

/* ── Module-level cache ──────────────────────────────────────────────────── */
/** 📖 The data is static for the lifetime of the dev/build, so we compute it
 *  once at module load. Subsequent calls just return the same array — keeps
 *  React renders cheap (referential equality) and matches the existing
 *  `lib/changelogs.ts` pattern. */
const providers: Map<string, ProviderInfo> = new Map(
  Object.entries(rawSources as Record<string, RawSource>).map(([k, v]) => [k, normalizeProvider(k, v)]),
)
const rows: CatalogRow[] = buildRows(providers)

/* ── Public API ──────────────────────────────────────────────────────────── */

export function getCatalog(): readonly CatalogRow[] {
  return rows
}

export function getProviders(): ProviderInfo[] {
  return [...providers.values()].sort((a, b) => b.modelCount - a.modelCount || a.name.localeCompare(b.name))
}

export function getTierCount(tier: Tier): number {
  let n = 0
  for (const r of rows) if (r.tier === tier) n++
  return n
}

export function getProviderCount(): number {
  return providers.size
}

export function getTotalCount(): number {
  return rows.length
}

/* ── Display helpers (also exported for the page UI) ─────────────────────── */

export function formatCtx(value: number, label: string): string {
  if (value <= 0) return '—'
  return label
}

/** 📖 Tier accent — Tailwind classes used to colour the badge in the table.
 *  Picked to read clearly on the `--color-bg` background and to follow a
 *  green→yellow→orange→red gradient as the score drops. */
export function tierAccent(tier: Tier): {
  text: string
  bg: string
  border: string
} {
  switch (tier) {
    case 'S+':
      return { text: 'text-[#c3ed06]', bg: 'bg-accent/15', border: 'border-accent/40' }
    case 'S':
      return { text: 'text-[#9ddb00]', bg: 'bg-[#9ddb00]/10', border: 'border-[#9ddb00]/30' }
    case 'A+':
      return { text: 'text-[#d4e25a]', bg: 'bg-[#d4e25a]/10', border: 'border-[#d4e25a]/30' }
    case 'A':
      return { text: 'text-[#e8c547]', bg: 'bg-[#e8c547]/10', border: 'border-[#e8c547]/30' }
    case 'A-':
      return { text: 'text-[#e89c47]', bg: 'bg-[#e89c47]/10', border: 'border-[#e89c47]/30' }
    case 'B+':
      return { text: 'text-[#e87a47]', bg: 'bg-[#e87a47]/10', border: 'border-[#e87a47]/30' }
    case 'B':
      return { text: 'text-[#e85a47]', bg: 'bg-[#e85a47]/10', border: 'border-[#e85a47]/30' }
    case 'C':
      return { text: 'text-fg-faint', bg: 'bg-fg-faint/10', border: 'border-fg-faint/20' }
  }
}

/** 📖 Quota chip palette — used in the Quota column. Keeps the four states
 *  visually distinct from the tier colours above. */
export function quotaAccent(code: QuotaCode): { text: string; bg: string; border: string } {
  switch (code) {
    case 'free':
      return { text: 'text-[#7ed957]', bg: 'bg-[#7ed957]/10', border: 'border-[#7ed957]/30' }
    case 'limited':
      return { text: 'text-[#e8c547]', bg: 'bg-[#e8c547]/10', border: 'border-[#e8c547]/30' }
    case 'metered':
      return { text: 'text-[#5bb8ff]', bg: 'bg-[#5bb8ff]/10', border: 'border-[#5bb8ff]/30' }
  }
}
