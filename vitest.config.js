import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom simuluje browser API (localStorage, window, CustomEvent, matchMedia…)
    environment: "jsdom",
    globals: false,
  },
});
