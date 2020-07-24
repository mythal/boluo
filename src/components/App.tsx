import React from 'react';
import { Router } from './Router';
import { Provider } from './Provider';

interface Props {}

export const App = React.memo<Props>(() => {
  return (
    <Provider>
      <Router />
    </Provider>
  );
});
