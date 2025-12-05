/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oahupsglz0lgjmbs.public.blob.vercel-storage.com',
      },
    ],
  }
}

module.exports = nextConfig
