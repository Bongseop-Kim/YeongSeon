import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { seedDesignPlugin } from "@seed-design/vite-plugin";
import path from "path";

export default defineConfig({
  server: {
    port: 5174,
    strictPort: true,
  },
  plugins: [react(), seedDesignPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "seed-design": path.resolve(__dirname, "./seed-design"),
    },
  },
});
