import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import App from './App/App';
import { ApolloProvider } from '@apollo/react-hooks';
import { client } from './client';

ReactDOM.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById('app-root')
);
