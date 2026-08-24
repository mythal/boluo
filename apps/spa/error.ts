import { isApiError } from '@boluo/api';
import { LogLevel, faro, getInternalFaroFromGlobalObject } from '@grafana/faro-web-sdk';
import { v7 as uuidv7 } from 'uuid';
import { IS_DEVELOPMENT } from './const';

const canSendTelemetry = () => !IS_DEVELOPMENT && Boolean(getInternalFaroFromGlobalObject());

export const recordWarn = (message: string, extras?: Record<string, unknown>) => {
  if (!canSendTelemetry()) {
    console.warn(message, extras);
    return;
  }
  faro.api.pushLog(extras ? [message, extras] : [message], {
    level: LogLevel.WARN,
  });
};

export const recordError = (message: string, extras?: Record<string, unknown>) => {
  if (!canSendTelemetry()) {
    console.error(message, extras);
    return;
  }
  faro.api.pushLog(extras ? [message, extras] : [message], {
    level: LogLevel.ERROR,
  });
};

interface CaptureExceptionOptions {
  componentStack?: string;
  context?: Record<string, string>;
  eventId?: string;
}

const normalizeException = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }
  if (isApiError(value)) {
    const message = 'message' in value ? `${value.code}: ${value.message}` : value.code;
    const cause = 'cause' in value && value.cause instanceof Error ? value.cause : undefined;
    return cause ? new Error(message, { cause }) : new Error(message);
  }
  return new Error(typeof value === 'string' ? value : 'Non-Error exception');
};

export const captureException = (
  value: unknown,
  { componentStack, context, eventId = uuidv7() }: CaptureExceptionOptions = {},
): string => {
  const error = normalizeException(value);
  if (!canSendTelemetry()) {
    console.error(error, { componentStack, context, eventId });
    return eventId;
  }
  faro.api.pushError(error, {
    context: {
      ...context,
      event_id: eventId,
      ...(componentStack ? { component_stack: componentStack } : {}),
    },
  });
  return eventId;
};
