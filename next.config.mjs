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
            {
                protocol: 'https',
                hostname: 'assets.zyrosite.com',
                port: '',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;
