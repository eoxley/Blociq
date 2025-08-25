import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  // Add optimizations to prevent chunk loading errors
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Configure webpack to handle chunk loading better
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Optimize chunk splitting for production
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    
    // Suppress deprecation warnings
    config.infrastructureLogging = {
      level: 'error',
    };
    
    return config;
  },
  // Add headers to prevent caching issues
  async headers() {
    return [
      {
        source: '/_next/static/chunks/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/cron/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/addin/:path*',
        headers: [
          { 
            key: 'Content-Security-Policy', 
            value: "frame-ancestors 'self' https://outlook.office.com https://outlook.office365.com https://*.office.com https://*.office365.com;" 
          },
        ],
      },
    ];
  },
  // Add output configuration for better deployment
  output: 'standalone',
};

export default nextConfig;
