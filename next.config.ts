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
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Temporarily disabled to fix Next.js 15.4.2 webpack minification bug
  // experimental: {
  //   optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  // },
  // Configure webpack to handle chunk loading better and OCR dependencies
  webpack: (config, { dev, isServer }) => {
    // Handle OCR dependencies that might not be available during build
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      canvas: false,
    };

    // Make OCR packages external for server-side builds to handle dynamic imports
    if (isServer) {
      config.externals = [...(config.externals || []), 'tesseract.js', 'pdfjs-dist', 'google-auth-library'];
    }
    
    // Fix for Next.js 15 webpack minification compatibility
    if (!dev && !isServer) {
      try {
        // Use terser plugin instead of default minification to avoid WebpackError constructor issue
        const TerserPlugin = require('terser-webpack-plugin');
        
        config.optimization.minimize = true;
        config.optimization.minimizer = [
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true,
                drop_debugger: true,
              },
              mangle: true,
              format: {
                comments: false,
              },
            },
            extractComments: false,
          }),
        ];
      } catch (error) {
        console.warn('TerserPlugin not available, falling back to default minification');
        // Fallback: disable minification if terser plugin fails
        config.optimization.minimize = false;
      }
      
      // Keep chunk splitting for performance
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
    
    // Completely disable source maps and source map references
    config.devtool = false;
    config.optimization = {
      ...config.optimization,
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: {
        ...config.optimization.splitChunks,
        hidePathInfo: true,
        filename: '[name].[contenthash].js',
      }
    };
    
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
  
  // Enhanced experimental features
  experimental: {
    serverComponentsExternalPackages: ['tesseract.js'],
  },
};

export default nextConfig;
