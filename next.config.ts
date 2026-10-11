import path from 'path'

import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs/config'

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

const nextConfig: NextConfig = {
  // Avoid picking C:\Users\Usuario\package-lock.json as workspace root (causes OOM on Windows)
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname)
  },
  experimental: {
    webpackMemoryOptimizations: true
  },
  webpack: (config, { dev }) => {
    // Persistent pack cache OOMs this 16GB Windows box while compiling Materio.
    // parallelism 1 avoids CPU/RAM thrash that makes the first compile look frozen.
    if (dev) {
      config.cache = false
      config.parallelism = 1
    }

    return config
  },
  basePath: process.env.BASEPATH,
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/en/apps/dashboard',
        permanent: false,
        locale: false
      },
      {
        source: '/:lang(en|fr|ar)',
        destination: '/:lang/apps/dashboard',
        permanent: false,
        locale: false
      },
      {
        source: '/:path((?!en|fr|ar|front-pages|images|api|docs|favicon.ico|sentry-tunnel).*)*',
        destination: '/en/:path*',
        permanent: true,
        locale: false
      }
    ]
  }
}

export default withSentryConfig(nextConfig, {
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
  ...(process.env.SENTRY_AUTH_TOKEN ? { authToken: process.env.SENTRY_AUTH_TOKEN } : {}),
  tunnelRoute: '/sentry-tunnel',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN
  }
})
