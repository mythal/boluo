import { Global } from '@emotion/react';
import Sprite from '@boluo/icons/legacy/Sprite';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './components/App';
import { store } from './store';
import { baseStyle } from './styles/atoms';
import { getRoot } from './utils/browser';
import { initializeFrontendTelemetry, setTelemetryUser } from './frontend-telemetry';
import { getDefaultBaseUrl } from './base-url';

initializeFrontendTelemetry(getDefaultBaseUrl());

let telemetryUserId: string | undefined;
store.subscribe(() => {
  const nextUserId = store.getState().profile?.user.id;
  if (nextUserId !== telemetryUserId) {
    telemetryUserId = nextUserId;
    setTelemetryUser(nextUserId);
  }
});

const root = createRoot(getRoot());
root.render(
  <Provider store={store}>
    <Sprite />
    <Global styles={baseStyle} />
    <App />
  </Provider>,
);
