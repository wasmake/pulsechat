/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        hostname: 'avatars.slack-edge.com',
      },
      {
        hostname: 'a.slack-edge.com',
      },
      {
        hostname: 'picsum.photos',
      },
    ],
  },
};

export default nextConfig;
