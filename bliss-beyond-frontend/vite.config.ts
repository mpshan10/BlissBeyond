// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type Plugin } from "vite";

const LOCAL_API_BASE_URL = "http://localhost:8081";

const resolveApiBaseUrl = (mode: string) => {
  const configuredUrl = loadEnv(mode, process.cwd(), "").VITE_API_BASE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");
  if (mode === "development") return LOCAL_API_BASE_URL;

  throw new Error("VITE_API_BASE_URL is required for production builds.");
};

const apiBaseUrlInjection = (mode: string): Plugin => ({
  name: "bb-api-base-url-injection",
  generateBundle(_options, bundle) {
    const apiBaseUrl = resolveApiBaseUrl(mode);

    for (const output of Object.values(bundle)) {
      if (output.type === "asset" && typeof output.source === "string") {
        output.source = output.source.replaceAll("__BB_API_BASE_URL__", apiBaseUrl);
      }
    }
  },
});

export default defineConfig(({ mode }) => ({
  vite: {
    plugins: [apiBaseUrlInjection(mode)],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
}));
