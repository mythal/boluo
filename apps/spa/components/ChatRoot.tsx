import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { type FC, type ReactNode, useEffect, useMemo } from 'react';
import { PaneList } from './PaneList';
import PaneLogin from './PaneLogin';
import { PaneWelcome } from './PaneWelcome';
import { clearToken } from '@boluo/api-browser';
import { setTelemetryUser } from '../frontend-telemetry';

export const ChatRoot: FC = () => {
  const { data: currentUser, isLoading } = useQueryCurrentUser({
    onSuccess: (data) => {
      if (!data) clearToken();
    },
  });
  useEffect(() => {
    setTelemetryUser(currentUser?.id);
  }, [currentUser?.id]);
  const defaultPane: ReactNode = useMemo(() => {
    if (isLoading) {
      return null;
    }
    if (!currentUser) {
      return <PaneLogin />;
    } else {
      return <PaneWelcome />;
    }
  }, [currentUser, isLoading]);
  return <PaneList defaultPane={defaultPane} />;
};
