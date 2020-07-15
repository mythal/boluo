import React from 'react';
import { Page } from './Page';
import { Provider } from './Provider';

interface Props {}

export const App = React.memo<Props>(() => {
  return (
    <Provider>
      <Page />
    </Provider>
  );
});
