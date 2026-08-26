import { isApiError } from '@boluo/api';
import { describeThrownValue } from '@boluo/utils/errors';
import {
  normalizeFrontendLogContext,
  type FrontendLogContextValue,
} from '@boluo/utils/frontend-telemetry';
import { LogLevel, faro, getInternalFaroFromGlobalObject } from '@grafana/faro-web-sdk';
import { v7 as uuidv7 } from 'uuid';
import { IS_DEVELOPMENT } from './const';

const canSendTelemetry = () => !IS_DEVELOPMENT && Boolean(getInternalFaroFromGlobalObject());

interface RecordLogOptions {
  context?: Record<string, FrontendLogContextValue>;
}

export const recordWarn = (
  message: string,
  extras?: Record<string, unknown>,
  { context }: RecordLogOptions = {},
) => {
  if (!canSendTelemetry()) {
    console.warn(message, extras);
    return;
  }
  faro.api.pushLog(extras ? [message, extras] : [message], {
    level: LogLevel.WARN,
    context: context ? normalizeFrontendLogContext(context) : undefined,
  });
};

export const recordError = (
  message: string,
  extras?: Record<string, unknown>,
  { context }: RecordLogOptions = {},
) => {
  if (!canSendTelemetry()) {
    console.error(message, extras);
    return;
  }
  faro.api.pushLog(extras ? [message, extras] : [message], {
    level: LogLevel.ERROR,
    context: context ? normalizeFrontendLogContext(context) : undefined,
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
  return new Error(`Non-Error exception: ${describeThrownValue(value)}`);
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
