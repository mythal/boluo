import { describeThrownValue } from '@boluo/utils/errors';

const CLOUDFLARE_INSIGHTS_SCRIPT = /static\.cloudflareinsights\.com\/beacon\.min\.js/i;
const OPAQUE_SCRIPT_ERROR = /^Script error\.$/i;
const MEDIA_AUTOPLAY_BLOCKED =
  /play\(\) failed because the user didn't interact with the document first/i;
const RESIZE_OBSERVER_LOOP =
  /ResizeObserver loop (?:limit exceeded|completed with undelivered notifications)/i;

export type FrontendLogContextValue = string | number | boolean | null | undefined;

export const normalizeFrontendLogContext = (
  context: Record<string, FrontendLogContextValue>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(context).flatMap(([key, value]) =>
      value == null ? [] : [[key, String(value)] as const],
    ),
  );

export function getFrontendTelemetryIgnoreErrors(
  additionalPatterns: Array<string | RegExp> = [],
): Array<string | RegExp> {
  return [
    CLOUDFLARE_INSIGHTS_SCRIPT,
    OPAQUE_SCRIPT_ERROR,
    MEDIA_AUTOPLAY_BLOCKED,
    RESIZE_OBSERVER_LOOP,
    ...additionalPatterns,
  ];
}

export const serializeFrontendLogArguments = (args: unknown[]): string =>
  args.map((arg) => (typeof arg === 'string' ? arg : describeThrownValue(arg))).join(' ');
