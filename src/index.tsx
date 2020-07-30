import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/App';
import { getRoot, ifMobile, setRealHeight } from './utils/dom';
import { Provider } from 'react-redux';
import { store } from './store';

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  getRoot()
);

ifMobile(() => {
  setRealHeight();
  window.addEventListener('resize', setRealHeight);
});
