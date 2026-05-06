import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/ws": {
        target: "http://127.0.0.1:5173",
        ws: true,
      },
    },
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
    }),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
    }),
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
