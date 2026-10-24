import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Genlink is the public-facing shell. Adapt is intentionally a separate app
// (and separate process) so the engine can keep evolving without changing the
// LMS UI. Both listeners are LAN-safe for a Fedora demo machine.
//
// `.local` / `.lan` in allowedHosts: Vite's host check refuses hostnames it
// does not know, and a leading dot allows the suffix and its subdomains.
// Students joining a class host machine very often type its Bonjour/mDNS
// name ("mymachine.local:8080") -- iPhones and Macs even complete it for
// them -- and without these entries those devices got Vite's "Blocked
// request" page while IP-typed joins worked, which reads as "Apple devices
// can't join". IP literals were always allowed; names were the gap.
const LAN_SAFE_HOSTS = [".e2b.app", "localhost", "127.0.0.1", ".local", ".lan"];

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: Number(process.env.VITE_PORT ?? 8080),
    strictPort: false,
    allowedHosts: LAN_SAFE_HOSTS,
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.VITE_PREVIEW_PORT ?? 4173),
    strictPort: false,
    allowedHosts: LAN_SAFE_HOSTS,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Keep the first download a phone has to parse small: framework and the
    // heaviest optional libraries (charts, docx import) ship as their own
    // chunks, so a learner opening the marketing page no longer parses the
    // admin import tool and every chart before anything can render. Route
    // components are split separately in App.tsx via React.lazy.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/](?:react|react-dom|scheduler)[\\/]/.test(id)) return "vendor-react";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("mammoth")) return "vendor-docx";
          return "vendor";
        },
      },
    },
  },
}));
