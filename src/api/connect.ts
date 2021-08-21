import { MailboxType } from './events';
import { Id } from '../utils/id';
import { get } from './request';

const DEBUG = process.env.NODE_ENV === 'development';

export const connect = (id: Id): Promise<WebSocket> => {
  const { host, protocol } = window.location;
  const ws = protocol == 'http:' && DEBUG ? 'ws:' : 'wss:';
  return get('/events/token', { id })
    .then((result) => {
      if (result.isOk && result.value.token) {
        return new WebSocket(`${ws}//${host}/api/events/connect?mailbox=${id}&token=${result.value.token}`);
      } else {
        return new WebSocket(`${ws}//${host}/api/events/connect?mailbox=${id}`);
      }
    })
    .catch(() => new WebSocket(`${ws}//${host}/api/events/connect?mailbox=${id}`));
};
