import { apiUrlAtom, setFaroSessionIdProvider } from '@boluo/api-browser';
import { store } from '@boluo/store';
import {
  getFrontendTelemetryIgnoreErrors,
  serializeFrontendLogArguments,
} from '@boluo/utils/frontend-telemetry';
import { isBrowserSupported } from '@boluo/utils/browser';
import { getInternalFaroFromGlobalObject, LogLevel, TransportItemType } from '@grafana/faro-core';
import {
  ErrorsInstrumentation,
  FetchTransport,
  SessionInstrumentation,
  WebVitalsInstrumentation,
  initializeFaro,
  type LogEvent,
  type TransportItem,
} from '@grafana/faro-web-sdk';
import { APP_VERSION, IS_DEVELOPMENT } from './const';
import { applyTelemetryUser } from './frontend-telemetry-user';

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
  if (IS_DEVELOPMENT || !isBrowserSupported()) {
    return;
  }

  const existingInstance = getInternalFaroFromGlobalObject();
  if (existingInstance) {
    setFaroSessionIdProvider(() => existingInstance.api.getSession()?.id);
    applyTelemetryUser();
    return;
  }

  let currentUrl = telemetryUrl();
  let transport = newTransport(currentUrl);
  const instance = initializeFaro({
    app: {
      name: 'spa',
      environment: telemetryEnvironment(),
      version: APP_VERSION,
      release: APP_VERSION,
    },
    batching: {
      enabled: true,
      itemLimit: 10,
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
    transports: [transport],
    webVitalsInstrumentation: {
      reportAllChanges: false,
      trackAttributionSources: false,
    },
  });

  setFaroSessionIdProvider(() => instance.api.getSession()?.id);
  applyTelemetryUser();

  store.sub(apiUrlAtom, () => {
    const nextUrl = telemetryUrl();
    if (nextUrl === currentUrl) {
      return;
    }
    const nextTransport = newTransport(nextUrl);
    instance.transports.add(nextTransport);
    instance.transports.remove(transport);
    currentUrl = nextUrl;
    transport = nextTransport;
  });
}
