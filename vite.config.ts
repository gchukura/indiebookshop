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
        // Simplified chunk splitting to prevent React undefined errors
        // Keep React in main bundle to ensure it's always available
        manualChunks: (id) => {
          // Only split very large vendor libraries
          if (id.includes('node_modules')) {
            // Keep React in main bundle to prevent undefined errors
            if (id.includes('react') || id.includes('react-dom')) {
              return undefined; // Keep in main bundle
            }
            // Split only the largest libraries
            if (id.includes('mapbox') || id.includes('react-map-gl')) {
              return 'vendor-map';
            }
            // Keep everything else in main bundle for now
            // This ensures React is always available when needed
            return undefined;
          }
          // Keep all source files in main bundle
          return undefined;
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
