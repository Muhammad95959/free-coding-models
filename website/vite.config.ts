import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { resolve as pathResolve } from 'node:path'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeShiki from '@shikijs/rehype'

// 📖 Resolve `sources.js` from the project root. The prebuild script
// (`scripts/copy-sources.mjs`) copies the file from the monorepo root
// into `website/src/_fcm-sources/sources.js` so Vercel can resolve it
// without needing the whole monorepo in its build context. Local dev
// also runs the prebuild via `npm run dev` (npm runs prebuild hooks
// automatically), so the alias works in both cases.
const fcmSourcesPath = pathResolve(
  fileURLToPath(new URL('./src/_fcm-sources/sources.js', import.meta.url)),
)

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 4328,
    strictPort: true,
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      // 📖 Mirror the tsconfig `paths` entry so Vite can resolve the same
      // 📖 alias at build/dev time. Lets the website pull `sources.js` from
      // 📖 the project root without sprinkling relative paths everywhere.
      'fcm-sources': fcmSourcesPath,
    },
  },
  plugins: [
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    {
      enforce: 'pre',
      ...mdx({
        include: /\.mdx$/,
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [
          remarkGfm,
          remarkFrontmatter,
          [remarkMdxFrontmatter, { name: 'frontmatter' }],
        ],
        rehypePlugins: [
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap', properties: { className: 'heading-anchor' } }],
          [
            rehypeShiki,
            {
              theme: 'github-dark',
            },
          ],
        ],
      }),
    },
    viteReact(),
    tailwindcss(),
  ],
})
