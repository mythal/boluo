import { GetMe } from 'api';
import { get } from 'api-browser';
import type { FC, ReactNode } from 'react';
import React, { useContext } from 'react';
import useSWR from 'swr';
import { unwrap } from 'utils';

const MeContext = React.createContext<GetMe | null>(null);

export const useMe = (): GetMe | null => useContext(MeContext);

export const MeProvider: FC<{ initialMe?: GetMe | null; children: ReactNode }> = ({ initialMe, children }) => {
  const { data } = useSWR(
    '/users/get_me',
    (path) => get(path, null).then(unwrap),
    initialMe !== undefined
      ? {
        fallbackData: initialMe,
        suspense: false,
      }
      : { suspense: true },
  );
  return <MeContext.Provider value={data ?? null}>{children}</MeContext.Provider>;
};
