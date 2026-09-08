import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      tailwindcss(),
      react(),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      watch: {
        usePolling: true,
      },
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL?.startsWith("http")
            ? new URL(env.VITE_API_BASE_URL).origin
            : "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});