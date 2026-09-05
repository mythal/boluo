import { isApiError, type ApiError } from '@boluo/api';
import { describeThrownValue } from '@boluo/utils/errors';
import { LogLevel, faro, getInternalFaroFromGlobalObject } from '@grafana/faro-core';
import { IS_DEVELOPMENT } from './const';

const API_WARNING_THROTTLE_MS = 60_000;
const lastApiWarningAt = new Map<string, number>();
const UUID_PATH_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CaptureExceptionOptions {
  context?: Record<string, string | undefined>;
  source: string;
}

interface ReportApiErrorOptions {
  requestPath: string;
  source: string;
}

const canSendTelemetry = () => !IS_DEVELOPMENT && Boolean(getInternalFaroFromGlobalObject());

const sanitizedPath = (pathname: string): string => {
  const segments = pathname.split('/');
  return segments
    .map((segment, index) => {
      const followsInvite = segments[index - 1] === 'invite' || segments[index - 2] === 'invite';
      const followsResetConfirm =
        segments[index - 1] === 'confirm' && segments[index - 2] === 'reset';
      return UUID_PATH_SEGMENT.test(segment) || followsInvite || followsResetConfirm
        ? ':id'
        : segment;
    })
    .join('/');
};

const currentPagePath = (): string | undefined =>
  typeof window === 'undefined' ? undefined : sanitizedPath(window.location.pathname);

const compactContext = (context: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(context).filter((entry): entry is [string, string] => entry[1] != null),
  );

const normalizeException = (value: unknown): Error => {
  if (value instanceof Error) return value;
  if (isApiError(value)) {
    const message = 'message' in value ? `${value.code}: ${value.message}` : value.code;
    const cause = 'cause' in value && value.cause instanceof Error ? value.cause : undefined;
    return cause ? new Error(message, { cause }) : new Error(message);
  }
  return new Error(`Non-Error exception: ${describeThrownValue(value)}`);
};

export function captureException(
  value: unknown,
  { context = {}, source }: CaptureExceptionOptions,
): void {
  const error = normalizeException(value);
  const errorContext = compactContext({
    ...context,
    source,
    request_path: context.request_path ?? currentPagePath(),
  });
  if (!canSendTelemetry()) {
    console.error(error, errorContext);
    return;
  }
  faro.api.pushError(error, { context: errorContext });
}

const shouldReportWarning = (key: string): boolean => {
  const now = Date.now();
  const lastReportedAt = lastApiWarningAt.get(key) ?? 0;
  if (now - lastReportedAt < API_WARNING_THROTTLE_MS) return false;
  lastApiWarningAt.set(key, now);
  return true;
};

const recordApiWarning = (error: ApiError, options: ReportApiErrorOptions): void => {
  const key = `${options.source}:${options.requestPath}:${error.code}`;
  if (!shouldReportWarning(key)) return;

  const message = `API request failed: ${error.code} ${options.requestPath}`;
  if (!canSendTelemetry()) {
    console.warn(message, error);
    return;
  }
  faro.api.pushLog([message], { level: LogLevel.WARN });
};

export function reportApiError(error: unknown, options: ReportApiErrorOptions): void {
  if (!isApiError(error)) {
    captureException(error, { source: options.source });
    return;
  }

  if (
    error.code === 'FETCH_FAIL' ||
    error.code === 'LIMIT_EXCEEDED' ||
    error.code === 'REQUEST_TIMEOUT'
  ) {
    recordApiWarning(error, options);
  } else if (
    error.code === 'NOT_JSON' ||
    error.code === 'UNEXPECTED' ||
    error.code === 'METHOD_NOT_ALLOWED' ||
    error.code === 'SERVICE_UNAVAILABLE'
  ) {
    captureException(error, {
      source: options.source,
      context: {
        api_error_code: error.code,
        request_path: options.requestPath,
      },
    });
  }
}
