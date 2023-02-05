import { Global } from '@emotion/react';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { App } from './components/App';
import { store } from './store';
import { baseStyle } from './styles/atoms';
import { getRoot } from './utils/browser';

ReactDOM.render(
  <Provider store={store}>
    <Global styles={baseStyle} />
    <App />
  </Provider>,
  getRoot(),
);
