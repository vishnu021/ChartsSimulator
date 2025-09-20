/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React strict mode to avoid legacy lifecycle warnings
  reactStrictMode: false,

  // Enable static export for integration with Spring Boot
  output: 'export',

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Configure trailing slash behavior
  trailingSlash: true,

  // Configure asset prefix for production if needed
  // assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',

  // Optimize for production build
  compiler: {
    // Remove console logs in production
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error'],
          }
        : false,
  },

  // Configure webpack for optimization
  webpack: (config, { isServer }) => {
    // Optimize bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Configure environment variables
  env: {
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
