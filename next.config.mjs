/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'darkgreen-lark-741030.hostingersite.com',
        port: '',
        pathname: '/img/**',
      },
    ],
  },
  trailingSlash: false,
};

export default nextConfig;
