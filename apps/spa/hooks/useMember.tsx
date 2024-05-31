import { type Member } from '@boluo/api';
import React from 'react';

export const MemberContext = React.createContext<Member | null>(null);

export const useMember = (): Member | null => {
  return React.useContext(MemberContext);
};
