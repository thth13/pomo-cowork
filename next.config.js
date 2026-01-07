/** @type {import('next').NextConfig} */
const nextConfig = {
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
      },
    ],
  }
}

module.exports = nextConfig
