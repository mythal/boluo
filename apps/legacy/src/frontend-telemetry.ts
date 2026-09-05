import { getInternalFaroFromGlobalObject, LogLevel, TransportItemType } from '@grafana/faro-core';
import {
  getFrontendTelemetryIgnoreErrors,
  serializeFrontendLogArguments,
} from '@boluo/utils/frontend-telemetry';
import { isBrowserSupported } from '@boluo/utils/browser';
import {
  ErrorsInstrumentation,
  FetchTransport,
  SessionInstrumentation,
  WebVitalsInstrumentation,
  initializeFaro,
  type LogEvent,
  type TransportItem,
} from '@grafana/faro-web-sdk';
import { applyTelemetryUser } from './frontend-telemetry-user';

const telemetryEnvironment = (): string => {
  const host = window.location.hostname;
  if (host.includes('staging')) return 'staging';
  if (host.endsWith('.pages.dev') || host.endsWith('.workers.dev')) return 'preview';
  return 'production';
};

export function initializeFrontendTelemetry(baseUrl: string): void {
  // DEV is a built-in Vite mode flag rather than a process environment variable.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (import.meta.env.DEV || !isBrowserSupported()) {
    return;
  }

  if (getInternalFaroFromGlobalObject()) {
    applyTelemetryUser();
    return;
  }

  const appVersion = import.meta.env.APP_VERSION || 'unknown';
  initializeFaro({
    app: {
      name: 'legacy',
      environment: telemetryEnvironment(),
      version: appVersion,
      release: appVersion,
    },
    batching: {
      enabled: true,
      itemLimit: 5,
      sendTimeout: 1_000,
    },
    beforeSend: (item) => {
      if (item.type === TransportItemType.LOG) {
        const { level } = (item as TransportItem<LogEvent>).payload;
        return level === LogLevel.WARN || level === LogLevel.ERROR ? item : null;
      }
      if (item.type === TransportItemType.EVENT || item.type === TransportItemType.TRACE) {
        return null;
      }
      return item;
    },
    ignoreErrors: getFrontendTelemetryIgnoreErrors(),
    ignoreUrls: [/\/api\/telemetry(?:[/?#]|$)/],
    logArgsSerializer: serializeFrontendLogArguments,
    instrumentations: [
      new ErrorsInstrumentation(),
      new WebVitalsInstrumentation(),
      new SessionInstrumentation(),
    ],
    sessionTracking: {
      enabled: true,
      persistent: false,
    },
    trackGeolocation: false,
    transports: [
      new FetchTransport({
        url: `${baseUrl}/api/telemetry`,
        requestCompression: false,
      }),
    ],
    webVitalsInstrumentation: {
      reportAllChanges: false,
      trackAttributionSources: false,
    },
  });
  applyTelemetryUser();
}
