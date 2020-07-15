import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/App';
import { getRoot, setRealHeight } from './dom';
import Design from './components/Design';
import { ifMobile } from './utils';

const DESIGN = true;

ReactDOM.render(DESIGN ? <Design /> : <App />, getRoot());

ifMobile(() => {
  setRealHeight();
  window.addEventListener('resize', setRealHeight);
});
