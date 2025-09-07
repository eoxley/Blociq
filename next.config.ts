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
  
  // Completely disable source maps in all environments
  productionBrowserSourceMaps: false,
  // Disable source maps in development too to prevent 404 errors
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  
  // Enable experimental features for faster builds
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    turbo: {},
    optimizeServerReact: true,
  },
  // Configure webpack for faster builds
  webpack: (config, { dev, isServer }) => {
    // Enable webpack caching for faster rebuilds
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    };

    // Ignore test files in production builds
    if (!dev) {
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/test\/data\/.*$/,
          contextRegExp: /.*/,
        })
      );
    }

    // Handle OCR dependencies that might not be available during build
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      canvas: false,
    };

    // Externalize heavy packages that aren't used in API routes
    if (isServer) {
      config.externals = [
        ...(config.externals || []), 
        'tesseract.js', 
        'google-auth-library',
        '@google-cloud/documentai',
        '@google-cloud/vision'
      ];
    }
    
    // Optimized chunk splitting for faster builds
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        maxAsyncRequests: 25,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          ocr: {
            test: /[\\/]node_modules[\\/](tesseract\.js|pdfjs-dist|@google-cloud)[\\/]/,
            name: 'ocr-libs',
            chunks: 'async',
            priority: 20,
          },
        },
      };
    }
    
    // Additional webpack optimizations for better compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Handle potential module resolution issues
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // Add module rules to handle potential import issues
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });
    
    // Suppress webpack warnings that might cause issues
    config.stats = {
      ...config.stats,
      warnings: false,
    };
    
    // Handle potential webpack compatibility issues
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    
    // Handle potential webpack compatibility issues
    config.infrastructureLogging = {
      level: 'error',
    };
    
    // Handle potential webpack compatibility issues
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /node_modules/,
    };
    
    // Completely disable source maps in all environments
    config.devtool = false;
    
    // Handle potential webpack compatibility issues
    config.mode = dev ? 'development' : 'production';
    
    // Handle potential webpack compatibility issues
    config.target = isServer ? 'node' : 'web';
    
    // Note: pdf-parse debug prevention moved to wrapper function
    
    return config;
  },
  // Add headers to prevent caching issues and enable Outlook add-in
  async headers() {
    return [
      // Outlook Add-in headers (legacy path)
      {
        source: '/addin/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://outlook.office.com https://outlook.office365.com https://*.office.com https://*.office365.com;",
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://outlook.office.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
      // Outlook Add-in headers (new path)
      {
        source: '/outlook-addin/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://outlook.office.com https://outlook.office365.com https://*.office.com https://*.office365.com;",
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://outlook.office.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
      // API routes for add-in
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://outlook.office.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
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
    ];
  },
  // Add output configuration for better deployment
  output: 'standalone',
  
  // Enhanced external packages (updated for Next.js 15+)
  serverExternalPackages: [
    'tesseract.js', 
    '@google-cloud/documentai',
    '@google-cloud/vision',
    'google-auth-library',
    'sharp'
  ],
};

export default nextConfig;
