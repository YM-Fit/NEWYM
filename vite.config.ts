import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Legacy plugin for older browsers (LG WebOS, Samsung Tizen Smart TVs)
    legacy({
      targets: ['chrome >= 53', 'safari >= 10', 'ios >= 10'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      modernPolyfills: true,
    }),
  ],
  build: {
    // Use ES2015 for maximum TV browser compatibility (LG webOS, Samsung Tizen, etc.)
    // Older WebOS versions use Chrome 53-68 which don't support ES2020 features
    target: 'es2015',
    minify: 'esbuild', // Faster than terser
    cssMinify: true,
    chunkSizeWarningLimit: 300, // Stricter limit to ensure smaller bundles
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    // Report bundle sizes
    reportCompressedSize: true,
    // Enable tree shaking
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
    },
    rollupOptions: {
      output: {
        // Generate manifest for preload hints
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
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
            // DnD Kit libraries
            if (id.includes('@dnd-kit')) {
              return 'dnd-vendor';
            }
            // Other vendor libraries - split by size
            return 'vendor';
          }
          // Don't split source code into separate chunks to avoid circular dependencies
          // Let Vite handle code splitting automatically for source files
          return null;
        },
      },
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
    // Pre-bundle heavy dependencies - use ES2015 for TV compatibility
    esbuildOptions: {
      target: 'es2015',
    },
  },
});
