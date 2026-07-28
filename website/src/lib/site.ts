/**
 * @file src/lib/site.ts
 * @description Site-wide constants for free-coding-models website.
 */

export const site = {
  name: 'free-coding-models',
  tagline: '100+ Free AI Coding Models with Auto-Failover & Health Checks',
  description:
    'Aggregate 100+ free AI coding models across Google Gemini, DeepSeek, Groq, Cerebras, HuggingFace, Together & local providers with automatic health checks, latency sorting, SWE score ranking, and seamless CLI/Desktop/OpenCode integration.',
  url: 'https://free-coding-models.dev',
  repo: 'https://github.com/vava-nessa/free-coding-models',
  npm: 'https://www.npmjs.com/package/free-coding-models',
  issues: 'https://github.com/vava-nessa/free-coding-models/issues',
  author: 'Vanessa Depraute',
  authorUrl: 'https://vanessadepraute.dev',
} as const

export const INSTALL_COMMAND = 'npm install -g free-coding-models'
