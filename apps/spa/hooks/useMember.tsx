import { type MemberWithUser } from '@boluo/api';
import React from 'react';

export const MemberContext = React.createContext<MemberWithUser | null>(null);

export const useMember = (): MemberWithUser | null => {
  return React.useContext(MemberContext);
};
