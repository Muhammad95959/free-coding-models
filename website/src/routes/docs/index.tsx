/**
 * @file src/routes/docs/index.tsx
 * @description Redirects /docs to /docs/introduction.
 */
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/')({
  loader: () => {
    throw redirect({
      to: '/docs/$',
      params: { _splat: 'introduction' },
    })
  },
})
