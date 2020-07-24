import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/App';
import { getRoot, ifMobile, setRealHeight } from './utils/dom';
import Design from './components/pages/Design';
import { DESIGN } from './settings';

ReactDOM.render(DESIGN ? <Design /> : <App />, getRoot());

ifMobile(() => {
  setRealHeight();
  window.addEventListener('resize', setRealHeight);
});
