import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const isDev = import.meta.env.DEV;

export function initMonitoring(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    // 100% in dev so every trace is visible; 20% in prod to stay within free tier
    tracesSampleRate: isDev ? 1.0 : 0.2,
  });
}

export function trackEvent(name: string, data?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    category: 'user.action',
    message: name,
    data,
    level: 'info',
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (isDev) {
    console.error('[monitoring]', error, context);
  }

  if (!DSN) return;

  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context as Record<string, unknown>);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}
