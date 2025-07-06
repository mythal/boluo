import { Id } from '../utils/id';

export const connect = (
  baseUrl: string,
  id: Id,
  token: Id,
  after: number | null,
  node: number | null,
  seq: number | null,
): WebSocket => {
  if (baseUrl.startsWith('https://')) {
    baseUrl = baseUrl.replace('https://', 'wss://');
  } else {
    baseUrl = baseUrl.replace('http://', 'ws://');
  }
  const paramsObject: Record<string, string> = { mailbox: id };
  if (token != null) paramsObject.token = token;
  if (after != null) {
    paramsObject.after = after.toString();
    if (node != null) {
      paramsObject.node = node.toString();
      if (seq != null) paramsObject.seq = seq.toString();
    }
  }
  const params = new URLSearchParams(paramsObject);
  return new WebSocket(`${baseUrl}/api/events/connect?${params.toString()}`);
};
