import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  entrypointsDir: "entrypoints",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Instagram AI Optimizer",
    description:
      "AI-powered Instagram feed remastering extension with premium animations",
    version: "0.0.1",
    permissions: ["storage", "activeTab", "tabs", "identity", "identity.email"],
    host_permissions: [
      "https://www.instagram.com/*",
      "https://instagram.com/*",
      "https://*.convex.cloud/*",
      "https://api.lemonsqueezy.com/*",
      "https://*.lemonsqueezy.com/*",
      "https://*.posthog.com/*",
      "https://*.sentry.io/*",
      "https://www.google-analytics.com/*",
      "https://www.googletagmanager.com/*",
    ],
    oauth2: {
      client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
      scopes: ["openid", "email", "profile"],
    },
    minimum_chrome_version: "88",
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  },
  runner: {
    startUrls: ["https://www.instagram.com/"],
  },
});
