import React from 'react';
import ReactDOM from 'react-dom';
// import { App } from './components/App';
import { getRoot, setRealHeight } from './dom';
import NewDesign from './components/NewDesign';
import { ifMobile } from './utils';

ReactDOM.render(<NewDesign />, getRoot());

ifMobile(() => {
  setRealHeight();
  window.addEventListener('resize', setRealHeight);
});
