import type { Key, KeyedMutator, SWRConfiguration, SWRResponse } from 'swr';

// In Suspense mode, `data` is always the fetch response
// https://swr.vercel.app/docs/suspense
// https://github.com/vercel/swr/issues/1412
declare module 'swr' {
  type SWRHook1 = <
    K extends Key,
    T,
  >(
    key: K,
    handler: (arg: K) => Promise<T>,
    config?: SWRConfiguration<T>,
  ) => SWRResponseSuspense<T>;

  type SWRResponseSuspense<D> = { data: D; mutate: KeyedMutator<D> };

  declare const _default: SWRHook1;
  export = _default;
}
