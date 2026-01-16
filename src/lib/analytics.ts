import { auth } from "./auth";

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
}

interface AnalyticsConfig {
  posthogApiKey?: string;
  sentryDsn?: string;
  gaTrackingId?: string;
}

const config: AnalyticsConfig = {
  posthogApiKey: import.meta.env.VITE_POSTHOG_API_KEY,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  gaTrackingId: import.meta.env.VITE_GA_TRACKING_ID,
};

let posthogInitialized = false;
let sentryInitialized = false;

export const analytics = {
  async init(): Promise<void> {
    const user = await auth.getCurrentUser();

    if (config.posthogApiKey) {
      this.initPostHog(user?.id);
    }

    if (config.sentryDsn) {
      this.initSentry(user?.id);
    }
  },

  initPostHog(userId?: string): void {
    if (posthogInitialized || !config.posthogApiKey) return;

    const distinctId = userId || `anon_${crypto.randomUUID()}`;

    fetch("https://app.posthog.com/capture/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: config.posthogApiKey,
        event: "$identify",
        distinct_id: distinctId,
        properties: {
          $set: { extension_version: chrome.runtime.getManifest().version },
        },
      }),
    }).catch(console.error);

    posthogInitialized = true;
  },

  initSentry(userId?: string): void {
    if (sentryInitialized || !config.sentryDsn) return;

    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      this.captureException(error || new Error(String(message)), {
        source,
        lineno,
        colno,
        userId,
      });

      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    const originalOnUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      this.captureException(event.reason, {
        type: "unhandledrejection",
        userId,
      });

      if (originalOnUnhandledRejection) {
        return originalOnUnhandledRejection.call(window, event);
      }
    };

    sentryInitialized = true;
  },

  track(event: string, properties?: Record<string, unknown>): void {
    this.trackPostHog({ name: event, properties });
    this.trackGA(event, properties);
  },

  trackPostHog(event: AnalyticsEvent): void {
    if (!config.posthogApiKey) return;

    auth.getCurrentUser().then((user) => {
      fetch("https://app.posthog.com/capture/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: config.posthogApiKey,
          event: event.name,
          distinct_id: user?.id || "anonymous",
          properties: {
            ...event.properties,
            extension_version: chrome.runtime.getManifest().version,
            url: window.location.href,
          },
        }),
      }).catch(console.error);
    });
  },

  trackGA(eventName: string, params?: Record<string, unknown>): void {
    if (!config.gaTrackingId) return;

    const measurementId = config.gaTrackingId;

    auth.getCurrentUser().then((user) => {
      const payload = {
        client_id: user?.id || crypto.randomUUID(),
        events: [
          {
            name: eventName,
            params: {
              ...params,
              engagement_time_msec: 100,
            },
          },
        ],
      };

      fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ).catch(console.error);
    });
  },

  captureException(
    error: Error | unknown,
    context?: Record<string, unknown>,
  ): void {
    if (!config.sentryDsn) {
      console.error("Error captured:", error, context);
      return;
    }

    const dsn = new URL(config.sentryDsn);
    const projectId = dsn.pathname.slice(1);
    const sentryKey = dsn.username;

    const errorObj = error instanceof Error ? error : new Error(String(error));

    const payload = {
      event_id: crypto.randomUUID().replace(/-/g, ""),
      timestamp: new Date().toISOString(),
      platform: "javascript",
      level: "error",
      logger: "javascript",
      exception: {
        values: [
          {
            type: errorObj.name,
            value: errorObj.message,
            stacktrace: errorObj.stack
              ? { frames: this.parseStackTrace(errorObj.stack) }
              : undefined,
          },
        ],
      },
      tags: {
        extension_version: chrome.runtime.getManifest().version,
      },
      extra: context,
    };

    fetch(
      `https://sentry.io/api/${projectId}/store/?sentry_key=${sentryKey}&sentry_version=7`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ).catch(console.error);
  },

  parseStackTrace(
    stack: string,
  ): Array<{
    filename: string;
    function: string;
    lineno: number;
    colno: number;
  }> {
    const lines = stack.split("\n").slice(1);
    return lines.map((line) => {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        return {
          function: match[1],
          filename: match[2],
          lineno: parseInt(match[3], 10),
          colno: parseInt(match[4], 10),
        };
      }
      return { filename: "unknown", function: "unknown", lineno: 0, colno: 0 };
    });
  },

  identify(userId: string, traits?: Record<string, unknown>): void {
    if (config.posthogApiKey) {
      fetch("https://app.posthog.com/capture/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: config.posthogApiKey,
          event: "$identify",
          distinct_id: userId,
          properties: { $set: traits },
        }),
      }).catch(console.error);
    }
  },
};
