import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom', '@supabase/supabase-js'],
  },
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
          // Split CRM components by feature
          if (id.includes('/crm/')) {
            if (id.includes('/crm/clients/')) {
              return 'crm-clients';
            }
            if (id.includes('/crm/analytics/') || id.includes('/crm/reports/')) {
              return 'crm-analytics';
            }
            if (id.includes('/crm/pipeline/') || id.includes('/crm/dashboard/')) {
              return 'crm-pipeline';
            }
            if (id.includes('/crm/shared/')) {
              return 'crm-shared';
            }
            if (id.includes('/crm/automation/')) {
              return 'crm-automation';
            }
            return 'crm-core';
          }
          // Split services by domain
          if (id.includes('/services/')) {
            if (id.includes('crm')) {
              return 'services-crm';
            }
            if (id.includes('analytics')) {
              return 'services-analytics';
            }
            return 'services-other';
          }
          // Split hooks
          if (id.includes('/hooks/')) {
            if (id.includes('crm')) {
              return 'hooks-crm';
            }
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
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
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
    ],
    // Pre-bundle heavy dependencies
    esbuildOptions: {
      target: 'esnext',
    },
  },
});
