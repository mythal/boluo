import React from 'react';
import ReactDOM from 'react-dom';
import { App as OldApp } from './components/App';
import { App } from './newComponents/App';
import { Design } from './newComponents/Design';

export const getRoot = () => {
  return document.getElementById('root') as HTMLElement;
};

ReactDOM.render(<App />, getRoot());

const setTrueScreenHeight = () => {
  // https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
  document.documentElement.style.setProperty('--inner-h', `${window.innerHeight}px`);
};

setTrueScreenHeight();

window.addEventListener('resize', setTrueScreenHeight);
