import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const sentryUploadEnabled = Boolean(
    env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT,
  );
  const plugins = [react(), tailwindcss()];

  if (sentryUploadEnabled) {
    plugins.push(
      sentryVitePlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        url: env.SENTRY_URL || undefined,
        telemetry: false,
        release: env.SENTRY_RELEASE
          ? {
              name: env.SENTRY_RELEASE,
            }
          : undefined,
        sourcemaps: {
          filesToDeleteAfterUpload: [
            "./dist/**/*.js.map",
            "./dist/**/*.css.map",
          ],
        },
      }),
    );
  }

  return {
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      sourcemap: sentryUploadEnabled,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@/shared": path.resolve(__dirname, "./src/shared"),
        "@/entities": path.resolve(__dirname, "./src/entities"),
        "@/features": path.resolve(__dirname, "./src/features"),
        "@/widgets": path.resolve(__dirname, "./src/widgets"),
        "@/pages": path.resolve(__dirname, "./src/pages"),
        "@/app": path.resolve(__dirname, "./src/app"),
      },
    },
  };
});
