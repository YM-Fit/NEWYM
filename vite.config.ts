import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - split more aggressively
          if (id.includes('node_modules')) {
            // React core - most critical, should be smallest
            if (id.includes('react/') && !id.includes('react-dom')) {
              return 'react-core';
            }
            if (id.includes('react-dom')) {
              return 'react-dom';
            }
            if (id.includes('react-hot-toast')) {
              return 'react-hot-toast';
            }
            // Supabase - large library, separate chunk
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // Charts - heavy library, lazy load (recharts + d3)
            if (id.includes('recharts') || id.includes('d3-') || id.includes('/d3/')) {
              return 'charts-vendor';
            }
            // Icons - can be large, separate chunk
            if (id.includes('lucide-react')) {
              return 'ui-icons';
            }
            // Date utilities
            if (id.includes('date-fns')) {
              return 'date-utils';
            }
            // Excel/CSV libraries
            if (id.includes('xlsx') || id.includes('papaparse')) {
              return 'export-vendor';
            }
            // Zod validation
            if (id.includes('zod')) {
              return 'validation-vendor';
            }
            // Sentry (if used)
            if (id.includes('@sentry')) {
              return 'monitoring-vendor';
            }
            // Other vendor libraries - split by size
            return 'vendor';
          }
          // Split services by domain
          if (id.includes('/services/')) {
            if (id.includes('analytics')) {
              return 'services-analytics';
            }
            return 'services-other';
          }
          // Split hooks
          if (id.includes('/hooks/')) {
            return 'hooks-other';
          }
          // Utils chunk
          if (id.includes('/utils/')) {
            return 'utils';
          }
        },
      },
    },
    chunkSizeWarningLimit: 300, // Stricter limit to ensure smaller bundles
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    // Compress output files
    minify: 'esbuild', // Faster than terser
    cssMinify: true,
    // Report bundle sizes
    reportCompressedSize: true,
    // Enable tree shaking
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
    },
  },
  esbuild: {
    treeShaking: true,
    // Keep console.log for debugging on TV - only drop debugger
    drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
    legalComments: 'none', // Remove all comments for smaller bundle
    // Optimize for smaller bundle
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      'react-hot-toast',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
    ],
    // Pre-bundle heavy dependencies
    esbuildOptions: {
      target: 'esnext',
    },
  },
});
