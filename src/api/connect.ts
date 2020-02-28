import { Id } from '../id';

export const connect = (id: Id, after: number): WebSocket => {
  const { host, protocol } = window.location;
  const ws = protocol === 'https:' ? 'wss:' : 'ws:';
  return new WebSocket(`${ws}//${host}/api/events/connect?mailbox=${id}&after=${after}`);
};
