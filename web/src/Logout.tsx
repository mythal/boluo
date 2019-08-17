import React from 'react';
import { isUserLoading, useUserState } from './user';
import { TOKEN_KEY } from './settings';
import { Redirect } from 'react-router';

export function Logout() {
  const userState = useUserState();
  if (isUserLoading(userState)) {
    return null;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    userState.refetch();
    return <Redirect to="/" />;
  }
}
