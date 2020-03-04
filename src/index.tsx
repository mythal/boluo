import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/App';

export const getRoot = () => {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root not found');
  }
  return root;
};

ReactDOM.render(<App />, getRoot());

const setTrueScreenHeight = () => {
  // https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
  document.documentElement.style.setProperty('--inner-h', `${window.innerHeight}px`);
};

setTrueScreenHeight();

window.addEventListener('resize', setTrueScreenHeight);
