import path from 'path'

import type { NextConfig } from 'next'

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
    // Persistent pack cache OOMs this 16GB Windows box while compiling Materio
    if (dev) {
      config.cache = false
    }

    return config
  },
  basePath: process.env.BASEPATH,
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/en/apps/rooms',
        permanent: false,
        locale: false
      },
      {
        source: '/:lang(en|fr|ar)',
        destination: '/:lang/apps/rooms',
        permanent: false,
        locale: false
      },
      {
        source: '/:path((?!en|fr|ar|front-pages|images|api|favicon.ico).*)*',
        destination: '/en/:path*',
        permanent: true,
        locale: false
      }
    ]
  }
}

export default nextConfig
