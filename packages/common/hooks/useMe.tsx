import type { GetMe } from 'api';
import type { FC, ReactNode } from 'react';
import React, { useContext } from 'react';
import useSWR from 'swr';
import { unwrap } from 'utils';
import { useGet } from './useGet';

const MeContext = React.createContext<GetMe | null>(null);

export const useMe = (): GetMe | null => useContext(MeContext);

export const MeProvider: FC<{ initialMe?: GetMe | null; children: ReactNode }> = ({ initialMe, children }) => {
  const get = useGet();
  const { data } = useSWR(
    '/users/get_me',
    (path) => get(path, null).then(unwrap),
    initialMe !== undefined
      ? {
        fallbackData: initialMe,
      }
      : {},
  );
  return <MeContext.Provider value={data ?? null}>{children}</MeContext.Provider>;
};
