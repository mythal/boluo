import { LogLevel, faro, getInternalFaroFromGlobalObject } from '@grafana/faro-web-sdk';
import { v7 as uuidv7 } from 'uuid';
import { IS_DEVELOPMENT } from './const';

export const recordWarn = (message: string, extras?: Record<string, unknown>) => {
  if (IS_DEVELOPMENT || !getInternalFaroFromGlobalObject()) {
    console.warn(message, extras);
    return;
  }
  faro.api.pushLog(extras ? [message, extras] : [message], {
    level: LogLevel.WARN,
  });
};

export const recordError = (message: string, extras?: Record<string, unknown>) => {
  if (IS_DEVELOPMENT || !getInternalFaroFromGlobalObject()) {
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
  faro.api.pushError(error, {
    context: {
      event_id: eventId,
      ...(componentStack ? { component_stack: componentStack } : {}),
    },
  });
  return eventId;
};
