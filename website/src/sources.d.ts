/**
 * @file src/sources.d.ts
 * @description Type declarations for the project's `sources.js` (the
 *   single source of truth for every free model the CLI can talk to).
 *
 *   📖 The file lives in the project root and is shared with the CLI; we
 *   don't own it from the website's perspective. The declarations below
 *   describe the parts we read so the bundler can type-check the imports
 *   without us having to maintain a parallel TS definition in `sources.js`.
 *
 *   Adding a new field to `sources` providers in `sources.js` is non-breaking
 *   for the CLI (it ignores unknown keys) but **does** require adding the
 *   matching field here for the website to use it. Keep this file in sync.
 */

declare module 'fcm-sources' {
  export type ModelTuple = [
    modelId: string,
    label: string,
    tier: 'S+' | 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'C',
    sweScore: string, // "82.8%" or "-"
    ctx: string, // "1M", "256k", "32k", "16k", or "-"
    sourceKey: string,
    addedDate?: string | null,
    deprecatedAfter?: string,
  ]

  export type Source = {
    name: string
    url: string
    quota?: string
    quotaCode?: 'free' | 'limited' | 'metered'
    models: ModelTuple[]
    noKeyNeeded?: boolean
    zenOnly?: boolean
  }

  export const sources: Record<string, Source>
  export const MODELS: ModelTuple[]
}
