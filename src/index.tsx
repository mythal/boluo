import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/App';
import { getRoot, setRealHeight } from './dom';
import { Design } from './components/Design';

ReactDOM.render(<Design />, getRoot());

setRealHeight();

window.addEventListener('resize', setRealHeight);
