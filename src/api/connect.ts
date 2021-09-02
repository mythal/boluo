import { Id } from '../utils/id';

const DEBUG = process.env.NODE_ENV === 'development';

export const connect = (id: Id, token: Id | null): WebSocket => {
  const { host, protocol } = window.location;
  const ws = protocol == 'http:' && DEBUG ? 'ws:' : 'wss:';
  if (token) {
    return new WebSocket(`${ws}//${host}/api/events/connect?mailbox=${id}&token=${token}`);
  } else {
    return new WebSocket(`${ws}//${host}/api/events/connect?mailbox=${id}`);
  }
};
