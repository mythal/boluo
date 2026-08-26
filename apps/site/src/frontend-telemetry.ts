import { apiUrlAtom, setFaroSessionIdProvider } from '@boluo/api-browser';
import { store } from '@boluo/store';
import { getFrontendTelemetryIgnoreErrors } from '@boluo/utils/frontend-telemetry';
import {
  ConsoleInstrumentation,
  ErrorsInstrumentation,
  FetchTransport,
  LogLevel,
  SessionInstrumentation,
  TransportItemType,
  WebVitalsInstrumentation,
  getInternalFaroFromGlobalObject,
  initializeFaro,
  type LogEvent,
  type TransportItem,
} from '@grafana/faro-web-sdk';
import { APP_VERSION, IS_DEVELOPMENT } from './const';

const telemetryUrl = () => `${store.get(apiUrlAtom)}/telemetry`;

const newTransport = (url: string) =>
  new FetchTransport({
    url,
    requestCompression: false,
  });

const telemetryEnvironment = (): string => {
  const host = window.location.hostname;
  if (host.includes('staging')) return 'staging';
  if (host.endsWith('.pages.dev') || host.endsWith('.workers.dev')) return 'preview';
  return 'production';
};

export function initializeFrontendTelemetry(): void {
  if (IS_DEVELOPMENT) {
    return;
  }

  const existingInstance = getInternalFaroFromGlobalObject();
  if (existingInstance) {
    setFaroSessionIdProvider(() => existingInstance.api.getSession()?.id);
    return;
  }

  let currentUrl = telemetryUrl();
  let transport = newTransport(currentUrl);
  const instance = initializeFaro({
    app: {
      name: 'site',
      environment: telemetryEnvironment(),
      version: APP_VERSION,
      release: APP_VERSION,
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
    instrumentations: [
      new ConsoleInstrumentation(),
      new ErrorsInstrumentation(),
      new WebVitalsInstrumentation(),
      new SessionInstrumentation(),
    ],
    sessionTracking: {
      enabled: true,
      persistent: false,
    },
    trackGeolocation: false,
    transports: [transport],
    webVitalsInstrumentation: {
      reportAllChanges: false,
      trackAttributionSources: false,
    },
  });

  setFaroSessionIdProvider(() => instance.api.getSession()?.id);

  store.sub(apiUrlAtom, () => {
    const nextUrl = telemetryUrl();
    if (nextUrl === currentUrl) return;

    const nextTransport = newTransport(nextUrl);
    instance.transports.add(nextTransport);
    instance.transports.remove(transport);
    currentUrl = nextUrl;
    transport = nextTransport;
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
