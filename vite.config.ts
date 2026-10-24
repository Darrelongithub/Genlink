import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Genlink is the public-facing shell. Adapt is intentionally a separate app
// (and separate process) so the engine can keep evolving without changing the
// LMS UI. Both listeners are LAN-safe for a Fedora demo machine.
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: Number(process.env.VITE_PORT ?? 8080),
    strictPort: false,
    allowedHosts: [".e2b.app", "localhost", "127.0.0.1"],
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.VITE_PREVIEW_PORT ?? 4173),
    strictPort: false,
    allowedHosts: [".e2b.app", "localhost", "127.0.0.1"],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
