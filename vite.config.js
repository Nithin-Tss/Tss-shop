import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  build: {
    // monacoSetup (~4 MB) is already lazy-loaded and slimmed (see src/lib/monacoMain.js);
    // limit sits just above it so any other oversized chunk still warns.
    chunkSizeWarningLimit: 4100,
    rollupOptions: {
      output: {
        // Stable vendor chunk: app deploys don't invalidate the cached React/router code
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
