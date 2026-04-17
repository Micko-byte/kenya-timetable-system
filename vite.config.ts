import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/', // Add this for Netlify
  server: {
    host: "::",
    port: 5173,
  },
  plugins: [react()], // Remove lovable-tagger
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
