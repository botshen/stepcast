import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;
const isGhPages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  base: isGhPages ? "/stepcast/" : "/",
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1425,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1426,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
