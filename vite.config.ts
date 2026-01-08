import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    cssCodeSplit: true, // Enable CSS code splitting to reduce initial bundle size
    cssMinify: true, // Minify CSS in production (reduces file size significantly)
    minify: 'esbuild', // Use esbuild for faster builds (terser requires additional dependency)
    rollupOptions: {
      output: {
        // Optimize chunk splitting for better caching and smaller initial bundles
        manualChunks: (id) => {
          // Split vendor libraries into separate chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('wouter')) {
              return 'vendor-router';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('mapbox') || id.includes('react-map-gl')) {
              return 'vendor-map';
            }
            // Other vendor libraries
            return 'vendor';
          }
          // Ensure files using React.useState are in main bundle
          // This prevents React from being undefined in vendor chunks
          // Files using "import * as React" and "React.useState" need React available
          if (id.includes('client/src')) {
            // Keep all hooks in main bundle to ensure React is available
            if (id.includes('/hooks/')) {
              return undefined;
            }
            // Keep UI components that use React.useState in main bundle
            if (id.includes('/components/ui/') && (
              id.includes('use-toast') || 
              id.includes('use-mobile') ||
              id.includes('sidebar') ||
              id.includes('carousel')
            )) {
              return undefined;
            }
          }
        },
        // Optimize asset file names for better caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
});
