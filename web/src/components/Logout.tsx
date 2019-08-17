import React from 'react';
import { TOKEN_KEY } from '../settings';
import { Redirect } from 'react-router';

export function Logout() {
  if (localStorage.getItem(TOKEN_KEY)) {
    localStorage.removeItem(TOKEN_KEY);
    location.reload();
    return null;
  } else {
    return <Redirect to="/" />;
  }
}
