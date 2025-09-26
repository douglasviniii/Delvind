/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    STRIPE_SECRET_KEY: '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',
    STRIPE_WEBHOOK_SECRET: 'whsec_VYEqGhhI55bQXez7O8jK9zxCFos0JJds',
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: "pk_live_51S4NUSRsBJHXBafPe3XkqLLzQJXcM1KBRqGZpeIDymH6lR0z7jd0YS4f77AsyW2R2fJsGteSGx5oWb69LTuHnctI00S0qizwZw",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'darkgreen-lark-741030.hostingersite.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.zyrosite.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
