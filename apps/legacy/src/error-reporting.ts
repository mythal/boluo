import {
  type AppError,
  FETCH_FAIL,
  LIMIT_EXCEEDED,
  METHOD_NOT_ALLOWED,
  NOT_JSON,
  UNEXPECTED,
} from './api/error';
import { describeThrownValue } from '@boluo/utils/errors';
import {
  normalizeFrontendLogContext,
  type FrontendLogContextValue,
} from '@boluo/utils/frontend-telemetry';
import { LogLevel, faro, getInternalFaroFromGlobalObject } from '@grafana/faro-web-sdk';

const REPORT_THROTTLE_MS = 60_000;
const lastReportAt = new Map<string, number>();
const UUID_PATH_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ReportOptions {
  requestPath?: string;
  source: string;
}

interface WarningOptions extends ReportOptions {
  context?: Record<string, FrontendLogContextValue>;
  details?: Record<string, unknown>;
}

interface CaptureOptions extends ReportOptions {
  componentStack?: string;
  context?: Record<string, string | undefined>;
}

const canSendTelemetry = (): boolean => Boolean(getInternalFaroFromGlobalObject());

const shouldReport = (key: string): boolean => {
  const now = Date.now();
  const lastReportedAt = lastReportAt.get(key) ?? 0;
  if (now - lastReportedAt < REPORT_THROTTLE_MS) return false;
  lastReportAt.set(key, now);
  return true;
};

const sanitizedPath = (pathname: string): string => {
  const segments = pathname.split('/');
  return segments
    .map((segment, index) => {
      const followsJoinSpace = segments[index - 2] === 'join' && segments[index - 1] === 'space';
      const followsJoinedSpaceId =
        segments[index - 3] === 'join' && segments[index - 2] === 'space';
      const followsResetConfirmation = segments[index - 1] === 'confirm-password-reset';
      return UUID_PATH_SEGMENT.test(segment) ||
        followsJoinSpace ||
        followsJoinedSpaceId ||
        followsResetConfirmation
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
  if (isAppError(value)) {
    return new Error(`${value.code}: ${value.message}`);
  }
  return new Error(`Non-Error exception: ${describeThrownValue(value)}`);
};

export const isAppError = (value: unknown): value is AppError =>
  typeof value === 'object' &&
  value != null &&
  'code' in value &&
  typeof value.code === 'string' &&
  'message' in value &&
  typeof value.message === 'string';

export function captureException(
  value: unknown,
  { componentStack, context = {}, requestPath, source }: CaptureOptions,
): void {
  if (!canSendTelemetry()) return;
  const errorContext = compactContext({
    ...context,
    source,
    request_path: requestPath ?? currentPagePath(),
    component_stack: componentStack,
  });
  faro.api.pushError(normalizeException(value), { context: errorContext });
}

export function captureRecoverableException(value: unknown, options: CaptureOptions): void {
  if (!canSendTelemetry()) return;
  const key = `exception:${options.source}:${options.requestPath ?? ''}`;
  if (!shouldReport(key)) return;
  captureException(value, options);
}

export function recordWarning(
  message: string,
  { context = {}, details, requestPath, source }: WarningOptions,
): void {
  if (!canSendTelemetry()) return;
  const logContext = normalizeFrontendLogContext({
    ...context,
    requestPath,
    source,
  });
  const contextKey = Object.entries(logContext)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const key = `warning:${source}:${requestPath ?? ''}:${message}:${contextKey}`;
  if (!shouldReport(key)) return;
  const formattedMessage = `${message} (${source}${requestPath ? ` ${requestPath}` : ''})`;
  faro.api.pushLog(details ? [formattedMessage, details] : [formattedMessage], {
    context: logContext,
    level: LogLevel.WARN,
  });
}

export function reportApiError(error: AppError, options: ReportOptions): void {
  if (error.code === FETCH_FAIL || error.code === LIMIT_EXCEEDED) {
    recordWarning(`API request failed: ${error.code}`, options);
  } else if (
    error.code === NOT_JSON ||
    error.code === UNEXPECTED ||
    error.code === METHOD_NOT_ALLOWED
  ) {
    captureRecoverableException(error, {
      ...options,
      context: { api_error_code: error.code },
    });
  }
}
