import { MailboxType } from './events';
import { Id } from '../utils/id';

const DEBUG = process.env.NODE_ENV === 'development';

export const connect = (id: Id): WebSocket => {
  const { host, protocol } = window.location;
  const ws = protocol == 'http:' && DEBUG ? 'ws:' : 'wss:';
  return new WebSocket(`${ws}//${host}/api/events/connect?mailbox=${id}`);
};
