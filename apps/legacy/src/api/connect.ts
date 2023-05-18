import { Id } from '../utils/id';

export const connect = (baseUrl: string, id: Id, token: Id | null): WebSocket => {
  if (baseUrl.startsWith('https://')) {
    baseUrl = baseUrl.replace('https://', 'wss://');
  } else {
    baseUrl = baseUrl.replace('http://', 'ws://');
  }
  if (token) {
    return new WebSocket(`${baseUrl}/api/events/connect?mailbox=${id}&token=${token}`);
  } else {
    return new WebSocket(`${baseUrl}/api/events/connect?mailbox=${id}`);
  }
};
