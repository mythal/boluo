import React from 'react';
import ReactDOM from 'react-dom';
// import { App } from './components/App';
import { getRoot, setRealHeight } from './dom';
import Design from './components/Design';
import { ifMobile } from './utils';

ReactDOM.render(<Design />, getRoot());

ifMobile(() => {
  setRealHeight();
  window.addEventListener('resize', setRealHeight);
});
