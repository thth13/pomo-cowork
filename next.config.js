const blobBaseUrl = (process.env.BLOB_BASE_URL || 'https://oahupsglz0lgjmbs.public.blob.vercel-storage.com').replace(/\/+$/, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Only the public asset address is exposed, never the Blob read/write token.
    NEXT_PUBLIC_BLOB_BASE_URL: blobBaseUrl,
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/beep/chat': ['./docs/beep-knowledge-base.md'],
    },
  },
  async redirects() {
    return [{ source: '/users', destination: '/leaderboard', permanent: true }]
  },
  images: {
    // Uploaded avatars get a new URL on replacement. For images changed in place,
    // version the source URL to avoid serving the previous image for up to 31 days.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    // Share cached avatar variants across 32–128px UI slots (including Retina).
    // Keep 384px for other small images; full-size device variants stay unchanged.
    imageSizes: [64, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oahupsglz0lgjmbs.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'dh5p0367pyzhh.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
    ],
  }
}

module.exports = nextConfig
