import { lazy as reactLazy } from 'react';

const RETRY_DELAY_MS = 100;
type LazyLoader = Parameters<typeof reactLazy>[0];

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export const lazyWithRetry = (load: LazyLoader) =>
  reactLazy(async () => {
    try {
      return await load();
    } catch {
      await delay(RETRY_DELAY_MS);
      return load();
    }
  });
