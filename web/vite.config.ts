import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The backend owns the route surface. The dev server proxies API traffic to the
// running substrate (default http://localhost:8080) so the console can talk to a
// locally booted `uvicorn api.main:app` without CORS configuration changes.
const BACKEND = process.env.ARKADIA_BACKEND ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Development convenience: the substrate console is often fronted by a
    // preview/proxy host. Restrict this to a list in any shared deployment.
    allowedHosts: true,
    proxy: {
      // Regex keys so the SPA's own routes (e.g. /routes) are never shadowed by
      // a broad "/api" prefix match.
      "^/api(?:/|$)": { target: BACKEND, changeOrigin: true },
      "^/solspire(?:/|$)": { target: BACKEND, changeOrigin: true },
      "^/health$": { target: BACKEND, changeOrigin: true },
      "^/openapi\\.json$": { target: BACKEND, changeOrigin: true },
      "^/docs(?:/|$)": { target: BACKEND, changeOrigin: true },
      "^/static(?:/|$)": { target: BACKEND, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
