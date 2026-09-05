void import('./frontend-telemetry')
  .then(({ initializeFrontendTelemetry }) => {
    initializeFrontendTelemetry();
  })
  .catch((error: unknown) => {
    // Monitoring failures must not prevent the application from starting.
    console.error('Failed to initialize frontend telemetry', error);
  });
