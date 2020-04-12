import React from 'react';
import ReactDOM from 'react-dom';
// import { App } from './components/App';
import { getRoot, setRealHeight } from './dom';
import NewDesign from './components/NewDesign';

ReactDOM.render(<NewDesign />, getRoot());

setRealHeight();

window.addEventListener('resize', setRealHeight);
