import { getInternalFaroFromGlobalObject } from '@grafana/faro-core';

const FARO_SESSION_ID_HEADER = 'X-Faro-Session-ID';
const MAX_FARO_SESSION_ID_LENGTH = 128;

export function withFaroSessionId(params: RequestInit = {}): RequestInit {
  const headers = new Headers(params.headers || {});
  const faroSessionId = getInternalFaroFromGlobalObject()?.api.getSession()?.id;
  if (faroSessionId && faroSessionId.length <= MAX_FARO_SESSION_ID_LENGTH) {
    headers.set(FARO_SESSION_ID_HEADER, faroSessionId);
  }
  return { ...params, headers };
}
