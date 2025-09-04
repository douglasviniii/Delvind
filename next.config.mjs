/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'darkgreen-lark-741030.hostingersite.com',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'assets.zyrosite.com',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '**',
            }
        ],
    },
    output: 'standalone', // Isso gera uma versão otimizada para produção
    swcMinify: true,
    compress: true,
};

export default nextConfig;
