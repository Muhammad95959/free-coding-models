#!/usr/bin/env node
/**
 * @file patch-openclaw.js
 * @description Patch OpenClaw to allow all NVIDIA models from free-coding-models
 *
 * This script adds ALL models from sources.js to OpenClaw's allowlist
 * so any NVIDIA model can be used without "not allowed" errors.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { nvidiaNim } from './sources.js'

const MODELS_JSON = join(homedir(), '.openclaw', 'agents', 'main', 'agent', 'models.json')
const OPENCLAW_JSON = join(homedir(), '.openclaw', 'openclaw.json')

console.log('🦞 Patching OpenClaw for full NVIDIA model support...\n')

// ─── Helper functions ───────────────────────────────────────────────────────────
// 📖 Parse a context-window string from sources.js: "200k" → 200_000, "1M" → 1_000_000.
// Falls back to 8192 if the format is unexpected.
function parseCtx(ctxStr) {
  if (typeof ctxStr !== 'string') return 8192
  const m = ctxStr.trim().match(/^(\d+(?:\.\d+)?)([kKmM]?)$/)
  if (!m) return 8192
  const n = Number(m[1])
  const unit = m[2]
  if (unit === 'M' || unit === 'm') return Math.round(n * 1_000_000)
  if (unit === 'K' || unit === 'k') return Math.round(n * 1000)
  return Math.round(n)
}

// 📖 Choose a sensible maxTokens from the real contextWindow.
// Rule: ~5% of context, clamped between 2k and 16k.
function defaultMaxTokens(ctx) {
  const pct = Math.round(ctx * 0.05)
  return Math.max(2048, Math.min(16384, pct))
}

// ─── Patch models.json ──────────────────────────────────────────────────────────
console.log('📄 Patching models.json...')

let modelsConfig
if (existsSync(MODELS_JSON)) {
  try {
    modelsConfig = JSON.parse(readFileSync(MODELS_JSON, 'utf8'))
  } catch (err) {
    console.error('  ✖ Failed to parse models.json:', err.message)
    process.exit(1)
  }
} else {
  console.error('  ✖ models.json not found at:', MODELS_JSON)
  process.exit(1)
}

// Backup
const backupPath = `${MODELS_JSON}.backup-${Date.now()}`
writeFileSync(backupPath, readFileSync(MODELS_JSON))
console.log(`  💾 Backup: ${backupPath}`)

// Ensure nvidia provider exists
if (!modelsConfig.providers) modelsConfig.providers = {}
if (!modelsConfig.providers.nvidia) {
  modelsConfig.providers.nvidia = {
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    api: 'openai-completions',
    models: []
  }
}

// Get existing model IDs
const existingModelIds = new Set(modelsConfig.providers.nvidia.models.map(m => m.id))

// Add all models from sources.js
// 📖 Each nvidiaNim tuple is: [modelId, label, tier, sweScore, ctx] — see sources.js:39
let addedCount = 0
for (const [modelId, label, tier, sweScore, ctx] of nvidiaNim) {
  if (existingModelIds.has(modelId)) {
    continue // Skip already existing models
  }

  const contextWindow = parseCtx(ctx)
  const maxTokens = defaultMaxTokens(contextWindow)
  const isThinking = modelId.includes('thinking')

  modelsConfig.providers.nvidia.models.push({
    id: modelId,
    name: label,
    contextWindow,
    maxTokens,
    reasoning: isThinking,
    input: ['text'],
    // 📖 OpenClaw ignores unknown fields, but we persist the real metadata
    // so anyone reading models.json can see the source-of-truth values.
    tier,
    sweScore,
    source: 'free-coding-models/sources.js',
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0
    }
  })

  addedCount++
}

// Write back
writeFileSync(MODELS_JSON, JSON.stringify(modelsConfig, null, 2))
console.log(`  ✅ Added ${addedCount} models to models.json`)
console.log(`  📊 Total NVIDIA models: ${modelsConfig.providers.nvidia.models.length}`)

// ─── Patch openclaw.json ────────────────────────────────────────────────────────
console.log('\n📄 Patching openclaw.json...')

let openclawConfig
if (existsSync(OPENCLAW_JSON)) {
  try {
    openclawConfig = JSON.parse(readFileSync(OPENCLAW_JSON, 'utf8'))
  } catch (err) {
    console.error('  ✖ Failed to parse openclaw.json:', err.message)
    process.exit(1)
  }
} else {
  console.error('  ✖ openclaw.json not found at:', OPENCLAW_JSON)
  process.exit(1)
}

// Backup
const openclawBackupPath = `${OPENCLAW_JSON}.backup-${Date.now()}`
writeFileSync(openclawBackupPath, readFileSync(OPENCLAW_JSON))
console.log(`  💾 Backup: ${openclawBackupPath}`)

// Ensure models.providers.nvidia exists
if (!openclawConfig.models) openclawConfig.models = {}
if (!openclawConfig.models.providers) openclawConfig.models.providers = {}
if (!openclawConfig.models.providers.nvidia) {
  openclawConfig.models.providers.nvidia = {
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    api: 'openai-completions',
    models: []
  }
}

// Get existing model IDs in openclaw.json
const existingOpenClawModelIds = new Set(
  (openclawConfig.models.providers.nvidia.models || []).map(m => m.id)
)

// Add all models (simplified config for openclaw.json)
let addedOpenClawCount = 0
for (const [modelId, label, tier] of nvidiaNim) {
  if (existingOpenClawModelIds.has(modelId)) {
    continue
  }

  const config = getModelConfig(tier)

  openclawConfig.models.providers.nvidia.models.push({
    id: modelId,
    name: label,
    contextWindow: config.contextWindow,
    maxTokens: config.maxTokens
  })

  addedOpenClawCount++
}

// Write back
writeFileSync(OPENCLAW_JSON, JSON.stringify(openclawConfig, null, 2))
console.log(`  ✅ Added ${addedOpenClawCount} models to openclaw.json`)
console.log(`  📊 Total NVIDIA models: ${openclawConfig.models.providers.nvidia.models.length}`)

// ─── Summary ────────────────────────────────────────────────────────────────────
console.log('\n✨ Patch complete!')
console.log('\n💡 Next steps:')
console.log('   1. Restart OpenClaw gateway: systemctl --user restart openclaw-gateway')
console.log('   2. Test with: free-coding-models --openclaw')
console.log('   3. Select any model - no more "not allowed" errors!')
console.log()
