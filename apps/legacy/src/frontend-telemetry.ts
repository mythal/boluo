import {
  ErrorsInstrumentation,
  FetchTransport,
  SessionInstrumentation,
  TransportItemType,
  WebVitalsInstrumentation,
  getInternalFaroFromGlobalObject,
  initializeFaro,
} from '@grafana/faro-web-sdk';

const FARO_SESSION_ID_HEADER = 'X-Faro-Session-ID';
const MAX_FARO_SESSION_ID_LENGTH = 128;

const telemetryEnvironment = (): string => {
  const host = window.location.hostname;
  if (host.includes('staging')) return 'staging';
  if (host.endsWith('.pages.dev') || host.endsWith('.workers.dev')) return 'preview';
  return 'production';
};

export function initializeFrontendTelemetry(baseUrl: string): void {
  // DEV is a built-in Vite mode flag rather than a process environment variable.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (import.meta.env.DEV || getInternalFaroFromGlobalObject()) {
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
      itemLimit: 10,
      sendTimeout: 1_000,
    },
    beforeSend: (item) => {
      if (
        item.type === TransportItemType.LOG ||
        item.type === TransportItemType.EVENT ||
        item.type === TransportItemType.TRACE
      ) {
        return null;
      }
      return item;
    },
    ignoreUrls: [/\/api\/telemetry(?:[/?#]|$)/],
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
}

export function setTelemetryUser(userId: string | null | undefined): void {
  const instance = getInternalFaroFromGlobalObject();
  if (!instance) return;

  if (userId) {
    instance.api.setUser({ id: userId });
  } else {
    instance.api.resetUser();
  }
}

export function withFaroSessionId(params: RequestInit = {}): RequestInit {
  const headers = new Headers(params.headers || {});
  const faroSessionId = getInternalFaroFromGlobalObject()?.api.getSession()?.id;
  if (faroSessionId && faroSessionId.length <= MAX_FARO_SESSION_ID_LENGTH) {
    headers.set(FARO_SESSION_ID_HEADER, faroSessionId);
  }
  return { ...params, headers };
}
