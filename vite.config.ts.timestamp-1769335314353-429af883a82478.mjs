// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import legacy from "@vitejs/plugin-legacy";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    // Legacy plugin for older browsers (LG WebOS, Samsung Tizen Smart TVs)
    legacy({
      targets: ["chrome >= 53", "safari >= 10", "ios >= 10"],
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
      renderLegacyChunks: true,
      modernPolyfills: true
    })
  ],
  build: {
    // Use ES2015 for maximum TV browser compatibility (LG webOS, Samsung Tizen, etc.)
    // Older WebOS versions use Chrome 53-68 which don't support ES2020 features
    target: "es2015",
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react/") && !id.includes("react-dom")) {
              return "react-core";
            }
            if (id.includes("react-dom")) {
              return "react-dom";
            }
            if (id.includes("react-hot-toast")) {
              return "react-hot-toast";
            }
            if (id.includes("@supabase")) {
              return "supabase-vendor";
            }
            if (id.includes("recharts") || id.includes("d3-") || id.includes("/d3/")) {
              return "charts-vendor";
            }
            if (id.includes("lucide-react")) {
              return "ui-icons";
            }
            if (id.includes("date-fns")) {
              return "date-utils";
            }
            if (id.includes("xlsx") || id.includes("papaparse")) {
              return "export-vendor";
            }
            if (id.includes("zod")) {
              return "validation-vendor";
            }
            if (id.includes("@sentry")) {
              return "monitoring-vendor";
            }
            return "vendor";
          }
          if (id.includes("/services/")) {
            if (id.includes("analytics")) {
              return "services-analytics";
            }
            return "services-other";
          }
          if (id.includes("/hooks/")) {
            return "hooks-other";
          }
          if (id.includes("/utils/")) {
            return "utils";
          }
        }
      }
    },
    chunkSizeWarningLimit: 300,
    // Stricter limit to ensure smaller bundles
    sourcemap: false,
    // Disable sourcemaps in production for smaller bundle
    // Compress output files
    minify: "esbuild",
    // Faster than terser
    cssMinify: true,
    // Report bundle sizes
    reportCompressedSize: true,
    // Enable tree shaking
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false
    }
  },
  esbuild: {
    treeShaking: true,
    // Keep console.log for debugging on TV - only drop debugger
    drop: process.env.NODE_ENV === "production" ? ["debugger"] : [],
    legalComments: "none",
    // Remove all comments for smaller bundle
    // Optimize for smaller bundle
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true
  },
  // Optimize dependencies
  optimizeDeps: {
    exclude: ["lucide-react"],
    include: [
      "react",
      "react-dom",
      "@supabase/supabase-js",
      "react-hot-toast",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities"
    ],
    // Pre-bundle heavy dependencies - use ES2015 for TV compatibility
    esbuildOptions: {
      target: "es2015"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgbGVnYWN5IGZyb20gJ0B2aXRlanMvcGx1Z2luLWxlZ2FjeSc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICAvLyBMZWdhY3kgcGx1Z2luIGZvciBvbGRlciBicm93c2VycyAoTEcgV2ViT1MsIFNhbXN1bmcgVGl6ZW4gU21hcnQgVFZzKVxuICAgIGxlZ2FjeSh7XG4gICAgICB0YXJnZXRzOiBbJ2Nocm9tZSA+PSA1MycsICdzYWZhcmkgPj0gMTAnLCAnaW9zID49IDEwJ10sXG4gICAgICBhZGRpdGlvbmFsTGVnYWN5UG9seWZpbGxzOiBbJ3JlZ2VuZXJhdG9yLXJ1bnRpbWUvcnVudGltZSddLFxuICAgICAgcmVuZGVyTGVnYWN5Q2h1bmtzOiB0cnVlLFxuICAgICAgbW9kZXJuUG9seWZpbGxzOiB0cnVlLFxuICAgIH0pLFxuICBdLFxuICBidWlsZDoge1xuICAgIC8vIFVzZSBFUzIwMTUgZm9yIG1heGltdW0gVFYgYnJvd3NlciBjb21wYXRpYmlsaXR5IChMRyB3ZWJPUywgU2Ftc3VuZyBUaXplbiwgZXRjLilcbiAgICAvLyBPbGRlciBXZWJPUyB2ZXJzaW9ucyB1c2UgQ2hyb21lIDUzLTY4IHdoaWNoIGRvbid0IHN1cHBvcnQgRVMyMDIwIGZlYXR1cmVzXG4gICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICBtaW5pZnk6ICdlc2J1aWxkJyxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiAoaWQpID0+IHtcbiAgICAgICAgICAvLyBWZW5kb3IgY2h1bmtzIC0gc3BsaXQgbW9yZSBhZ2dyZXNzaXZlbHlcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICAgICAgICAvLyBSZWFjdCBjb3JlIC0gbW9zdCBjcml0aWNhbCwgc2hvdWxkIGJlIHNtYWxsZXN0XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlYWN0LycpICYmICFpZC5pbmNsdWRlcygncmVhY3QtZG9tJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdyZWFjdC1jb3JlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVhY3QtZG9tJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdyZWFjdC1kb20nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdC1ob3QtdG9hc3QnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3JlYWN0LWhvdC10b2FzdCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBTdXBhYmFzZSAtIGxhcmdlIGxpYnJhcnksIHNlcGFyYXRlIGNodW5rXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0BzdXBhYmFzZScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnc3VwYWJhc2UtdmVuZG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIENoYXJ0cyAtIGhlYXZ5IGxpYnJhcnksIGxhenkgbG9hZCAocmVjaGFydHMgKyBkMylcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVjaGFydHMnKSB8fCBpZC5pbmNsdWRlcygnZDMtJykgfHwgaWQuaW5jbHVkZXMoJy9kMy8nKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2NoYXJ0cy12ZW5kb3InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWNvbnMgLSBjYW4gYmUgbGFyZ2UsIHNlcGFyYXRlIGNodW5rXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2x1Y2lkZS1yZWFjdCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAndWktaWNvbnMnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRGF0ZSB1dGlsaXRpZXNcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZGF0ZS1mbnMnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2RhdGUtdXRpbHMnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRXhjZWwvQ1NWIGxpYnJhcmllc1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCd4bHN4JykgfHwgaWQuaW5jbHVkZXMoJ3BhcGFwYXJzZScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnZXhwb3J0LXZlbmRvcic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBab2QgdmFsaWRhdGlvblxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCd6b2QnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZhbGlkYXRpb24tdmVuZG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFNlbnRyeSAoaWYgdXNlZClcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQHNlbnRyeScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnbW9uaXRvcmluZy12ZW5kb3InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gT3RoZXIgdmVuZG9yIGxpYnJhcmllcyAtIHNwbGl0IGJ5IHNpemVcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yJztcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gU3BsaXQgc2VydmljZXMgYnkgZG9tYWluXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc2VydmljZXMvJykpIHtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnYW5hbHl0aWNzJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdzZXJ2aWNlcy1hbmFseXRpY3MnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICdzZXJ2aWNlcy1vdGhlcic7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFNwbGl0IGhvb2tzXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvaG9va3MvJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnaG9va3Mtb3RoZXInO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBVdGlscyBjaHVua1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3V0aWxzLycpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3V0aWxzJztcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAzMDAsIC8vIFN0cmljdGVyIGxpbWl0IHRvIGVuc3VyZSBzbWFsbGVyIGJ1bmRsZXNcbiAgICBzb3VyY2VtYXA6IGZhbHNlLCAvLyBEaXNhYmxlIHNvdXJjZW1hcHMgaW4gcHJvZHVjdGlvbiBmb3Igc21hbGxlciBidW5kbGVcbiAgICAvLyBDb21wcmVzcyBvdXRwdXQgZmlsZXNcbiAgICBtaW5pZnk6ICdlc2J1aWxkJywgLy8gRmFzdGVyIHRoYW4gdGVyc2VyXG4gICAgY3NzTWluaWZ5OiB0cnVlLFxuICAgIC8vIFJlcG9ydCBidW5kbGUgc2l6ZXNcbiAgICByZXBvcnRDb21wcmVzc2VkU2l6ZTogdHJ1ZSxcbiAgICAvLyBFbmFibGUgdHJlZSBzaGFraW5nXG4gICAgdHJlZXNoYWtlOiB7XG4gICAgICBtb2R1bGVTaWRlRWZmZWN0czogZmFsc2UsXG4gICAgICBwcm9wZXJ0eVJlYWRTaWRlRWZmZWN0czogZmFsc2UsXG4gICAgICB0cnlDYXRjaERlb3B0aW1pemF0aW9uOiBmYWxzZSxcbiAgICB9LFxuICB9LFxuICBlc2J1aWxkOiB7XG4gICAgdHJlZVNoYWtpbmc6IHRydWUsXG4gICAgLy8gS2VlcCBjb25zb2xlLmxvZyBmb3IgZGVidWdnaW5nIG9uIFRWIC0gb25seSBkcm9wIGRlYnVnZ2VyXG4gICAgZHJvcDogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyA/IFsnZGVidWdnZXInXSA6IFtdLFxuICAgIGxlZ2FsQ29tbWVudHM6ICdub25lJywgLy8gUmVtb3ZlIGFsbCBjb21tZW50cyBmb3Igc21hbGxlciBidW5kbGVcbiAgICAvLyBPcHRpbWl6ZSBmb3Igc21hbGxlciBidW5kbGVcbiAgICBtaW5pZnlJZGVudGlmaWVyczogdHJ1ZSxcbiAgICBtaW5pZnlTeW50YXg6IHRydWUsXG4gICAgbWluaWZ5V2hpdGVzcGFjZTogdHJ1ZSxcbiAgfSxcbiAgLy8gT3B0aW1pemUgZGVwZW5kZW5jaWVzXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gICAgaW5jbHVkZTogW1xuICAgICAgJ3JlYWN0JyxcbiAgICAgICdyZWFjdC1kb20nLFxuICAgICAgJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcycsXG4gICAgICAncmVhY3QtaG90LXRvYXN0JyxcbiAgICAgICdAZG5kLWtpdC9jb3JlJyxcbiAgICAgICdAZG5kLWtpdC9zb3J0YWJsZScsXG4gICAgICAnQGRuZC1raXQvdXRpbGl0aWVzJyxcbiAgICBdLFxuICAgIC8vIFByZS1idW5kbGUgaGVhdnkgZGVwZW5kZW5jaWVzIC0gdXNlIEVTMjAxNSBmb3IgVFYgY29tcGF0aWJpbGl0eVxuICAgIGVzYnVpbGRPcHRpb25zOiB7XG4gICAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sWUFBWTtBQUduQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUE7QUFBQSxJQUVOLE9BQU87QUFBQSxNQUNMLFNBQVMsQ0FBQyxnQkFBZ0IsZ0JBQWdCLFdBQVc7QUFBQSxNQUNyRCwyQkFBMkIsQ0FBQyw2QkFBNkI7QUFBQSxNQUN6RCxvQkFBb0I7QUFBQSxNQUNwQixpQkFBaUI7QUFBQSxJQUNuQixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsT0FBTztBQUFBO0FBQUE7QUFBQSxJQUdMLFFBQVE7QUFBQSxJQUNSLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWMsQ0FBQyxPQUFPO0FBRXBCLGNBQUksR0FBRyxTQUFTLGNBQWMsR0FBRztBQUUvQixnQkFBSSxHQUFHLFNBQVMsUUFBUSxLQUFLLENBQUMsR0FBRyxTQUFTLFdBQVcsR0FBRztBQUN0RCxxQkFBTztBQUFBLFlBQ1Q7QUFDQSxnQkFBSSxHQUFHLFNBQVMsV0FBVyxHQUFHO0FBQzVCLHFCQUFPO0FBQUEsWUFDVDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxpQkFBaUIsR0FBRztBQUNsQyxxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxHQUFHLFNBQVMsV0FBVyxHQUFHO0FBQzVCLHFCQUFPO0FBQUEsWUFDVDtBQUVBLGdCQUFJLEdBQUcsU0FBUyxVQUFVLEtBQUssR0FBRyxTQUFTLEtBQUssS0FBSyxHQUFHLFNBQVMsTUFBTSxHQUFHO0FBQ3hFLHFCQUFPO0FBQUEsWUFDVDtBQUVBLGdCQUFJLEdBQUcsU0FBUyxjQUFjLEdBQUc7QUFDL0IscUJBQU87QUFBQSxZQUNUO0FBRUEsZ0JBQUksR0FBRyxTQUFTLFVBQVUsR0FBRztBQUMzQixxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxHQUFHLFNBQVMsTUFBTSxLQUFLLEdBQUcsU0FBUyxXQUFXLEdBQUc7QUFDbkQscUJBQU87QUFBQSxZQUNUO0FBRUEsZ0JBQUksR0FBRyxTQUFTLEtBQUssR0FBRztBQUN0QixxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxHQUFHLFNBQVMsU0FBUyxHQUFHO0FBQzFCLHFCQUFPO0FBQUEsWUFDVDtBQUVBLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLFlBQVksR0FBRztBQUM3QixnQkFBSSxHQUFHLFNBQVMsV0FBVyxHQUFHO0FBQzVCLHFCQUFPO0FBQUEsWUFDVDtBQUNBLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLFNBQVMsR0FBRztBQUMxQixtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUyxTQUFTLEdBQUc7QUFDMUIsbUJBQU87QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSx1QkFBdUI7QUFBQTtBQUFBLElBQ3ZCLFdBQVc7QUFBQTtBQUFBO0FBQUEsSUFFWCxRQUFRO0FBQUE7QUFBQSxJQUNSLFdBQVc7QUFBQTtBQUFBLElBRVgsc0JBQXNCO0FBQUE7QUFBQSxJQUV0QixXQUFXO0FBQUEsTUFDVCxtQkFBbUI7QUFBQSxNQUNuQix5QkFBeUI7QUFBQSxNQUN6Qix3QkFBd0I7QUFBQSxJQUMxQjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLGFBQWE7QUFBQTtBQUFBLElBRWIsTUFBTSxRQUFRLElBQUksYUFBYSxlQUFlLENBQUMsVUFBVSxJQUFJLENBQUM7QUFBQSxJQUM5RCxlQUFlO0FBQUE7QUFBQTtBQUFBLElBRWYsbUJBQW1CO0FBQUEsSUFDbkIsY0FBYztBQUFBLElBQ2Qsa0JBQWtCO0FBQUEsRUFDcEI7QUFBQTtBQUFBLEVBRUEsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxJQUN4QixTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsZ0JBQWdCO0FBQUEsTUFDZCxRQUFRO0FBQUEsSUFDVjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
