import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import jokkoondiral from "./plugin/jokkoondiral";

const racine = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  // Chemins relatifs : l'app fonctionne servie sous /collect/ comme à la racine d'un domaine.
  base: "./",
  plugins: [jokkoondiral(racine)],
  build: { target: "es2019", sourcemap: false, assetsInlineLimit: 0 },
  server: {
    port: 5174,
    // En dev, l'envoi part vers apps/webhooks (pnpm dev:webhooks), comme derrière Nginx en production.
    proxy: { "/webhooks": { target: "http://localhost:3000", rewrite: (p) => p.replace(/^\/webhooks/, "") } },
  },
});
