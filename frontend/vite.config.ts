import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    fs: {
      // 允許讀 frontend/ 之外的 themes/、data/（manifest + counties SSOT）
      allow: [path.resolve(__dirname, ".."), path.resolve(__dirname)],
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
  assetsInclude: ["**/*.yaml"],
});
