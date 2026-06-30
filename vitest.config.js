import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: false,
    pool: "threads",
    testTimeout: 15000,
    server: {
      deps: {
        // Force Supabase packages through Vite transform to fix ESM/CJS interop
        inline: ["@supabase/supabase-js", "@supabase/auth-js", "@supabase/postgrest-js"],
      },
    },
  },
});
