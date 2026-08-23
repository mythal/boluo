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
  eventId?: string;
}

export const captureException = (
  value: unknown,
  { componentStack, eventId = uuidv7() }: CaptureExceptionOptions = {},
): string => {
  const error = value instanceof Error ? value : new Error(String(value));
  if (!canSendTelemetry()) {
    console.error(error, { componentStack, eventId });
    return eventId;
  }
  faro.api.pushError(error, {
    context: {
      event_id: eventId,
      ...(componentStack ? { component_stack: componentStack } : {}),
    },
  });
  return eventId;
};
