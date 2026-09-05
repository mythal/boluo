import Sprite from '@boluo/icons/legacy/Sprite';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './components/App';
import { store } from './store';
import { getRoot } from './utils/browser';
import { setTelemetryUser } from './frontend-telemetry-user';
import { getDefaultBaseUrl } from './base-url';
import PageError from './components/molecules/PageError';
import './tailwind.css';

void import('./frontend-telemetry')
  .then(({ initializeFrontendTelemetry }) => {
    initializeFrontendTelemetry(getDefaultBaseUrl());
  })
  .catch(() => {
    // Telemetry must never prevent the legacy application from starting.
  });

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
    <PageError>
      <Sprite />
      <App />
    </PageError>
  </Provider>,
);
