const blobBaseUrl = (process.env.BLOB_BASE_URL || 'https://oahupsglz0lgjmbs.public.blob.vercel-storage.com').replace(/\/+$/, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Only the public asset address is exposed, never the Blob read/write token.
    NEXT_PUBLIC_BLOB_BASE_URL: blobBaseUrl,
  },
  async redirects() {
    return [{ source: '/users', destination: '/leaderboard', permanent: true }]
  },
  images: {
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
