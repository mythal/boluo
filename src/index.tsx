import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/App';
import { getRoot, ifMobile, setRealHeight } from './utils/dom';

ReactDOM.render(<App />, getRoot());

ifMobile(() => {
  setRealHeight();
  window.addEventListener('resize', setRealHeight);
});
