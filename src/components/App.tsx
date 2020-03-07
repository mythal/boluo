import React from 'react';
import { Provider } from './Provider';
import { Page } from './Page';

interface Props {}

export const App = React.memo<Props>(() => {
  return (
    <Provider>
      <Page />
    </Provider>
  );
});
