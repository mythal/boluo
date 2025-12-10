import { IS_DEVELOPMENT } from './const';

if (!IS_DEVELOPMENT) {
  throw new Error('This file should only be imported in development environment');
}

export const delay = ({
  ms,
  err,
  delayChance,
  errChance,
}: {
  ms?: number;
  err?: boolean | string | null | undefined;
  delayChance?: number;
  errChance?: number;
} = {}): Promise<void> => {
  ms = ms ?? 1000;
  delayChance = delayChance ?? 1;
  errChance = errChance ?? (err ? 1 : 0);
  return new Promise((resolve, reject) => {
    if (!IS_DEVELOPMENT) {
      resolve();
    }
    const shouldDelay = Math.random() < delayChance;
    const shouldErr = Math.random() < errChance;
    if (!shouldDelay && !shouldErr) {
      resolve();
    } else if (!shouldErr && shouldDelay) {
      setTimeout(resolve, ms);
    } else {
      const ApiError = {
        type: 'UnexpectedError',
        message: typeof err === 'string' ? err : 'Successfully failed',
      };
      setTimeout(() => reject(new Error(ApiError.message, { cause: ApiError })), ms);
    }
  });
};

export const triggerError = (e: unknown = 'Successfully failed'): void => {
  if (!IS_DEVELOPMENT || !e) {
    return;
  }
  if (typeof e === 'string') {
    throw new Error(e);
  } else if (e instanceof Error) {
    throw e;
  } else {
    throw new Error('Successfully triggered an unknown error', e);
  }
};
