import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET ||
    env.VITE_API_BASE_URL ||
    "https://ugem-backend.onrender.com";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;

            if (
              id.includes("react/") ||
              id.includes("react-dom/") ||
              id.includes("react-router") ||
              id.includes("scheduler/")
            ) {
              return "vendor-react";
            }

            if (id.includes("@tanstack/react-query")) {
              return "vendor-query";
            }

            if (
              id.includes("@vietmap/") ||
              id.includes("maplibre-gl") ||
              id.includes("leaflet/")
            ) {
              return "vendor-maps";
            }

            if (
              id.includes("@radix-ui/") ||
              id.includes("lucide-react") ||
              id.includes("sonner/")
            ) {
              return "vendor-ui";
            }

            return undefined;
          },
        },
      },
    },
  };
});
