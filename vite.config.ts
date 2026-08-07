import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["difflab.codeshell.online"],
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4318",
      "/demo": "http://127.0.0.1:4318"
    }
  }
});
