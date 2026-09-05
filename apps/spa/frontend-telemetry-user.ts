import { getInternalFaroFromGlobalObject } from '@grafana/faro-core';

// undefined means no update yet; null means the user has signed out.
let telemetryUserId: string | null | undefined;

export function applyTelemetryUser(): void {
  const instance = getInternalFaroFromGlobalObject();
  if (telemetryUserId === undefined || !instance) return;

  if (telemetryUserId) {
    instance.api.setUser({ id: telemetryUserId });
  } else {
    instance.api.resetUser();
  }
}

export function setTelemetryUser(userId: string | null | undefined): void {
  telemetryUserId = userId ?? null;
  applyTelemetryUser();
}
