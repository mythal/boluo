import { ApolloClient } from 'apollo-client';
import { split } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import { setContext } from 'apollo-link-context';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { GRAPHQL_URL, TOKEN_KEY, WEBSOCKET_URL } from './settings';
import { WebSocketLink } from 'apollo-link-ws';
import { getMainDefinition } from 'apollo-utilities';

const token = localStorage.getItem(TOKEN_KEY);
const wsLink = new WebSocketLink({
  uri: WEBSOCKET_URL,
  options: {
    reconnect: true,
    connectionParams: {
      authorization: token ? `Bearer ${token}` : '',
    },
  },
});

const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
});

const authLink = setContext((_, { headers }) => {
  // get the authentication token from local storage if it exists
  const token = localStorage.getItem(TOKEN_KEY);
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const link = split(
  // split based on operation type
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  authLink.concat(httpLink)
);

export const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});
