import { initializeFrontendTelemetry } from './frontend-telemetry';

try {
  initializeFrontendTelemetry();
} catch (error) {
  // Monitoring failures must not prevent the application from starting.
  console.error('Failed to initialize frontend telemetry', error);
}
