import { Global } from '@emotion/react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './components/App';
import { store } from './store';
import { baseStyle } from './styles/atoms';
import { getRoot } from './utils/browser';

const root = createRoot(getRoot());
root.render(
  <Provider store={store}>
    <Global styles={baseStyle} />
    <App />
  </Provider>,
);
