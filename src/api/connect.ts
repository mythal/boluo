import { MailboxType } from './events';
import { Id } from '@/utils/id';

export const connect = (id: Id, type: MailboxType, after: number): WebSocket => {
  const { host, protocol } = window.location;
  const ws = protocol === 'https:' ? 'wss:' : 'ws:';
  return new WebSocket(`${ws}//${host}/api/events/connect?mailbox=${id}&mailboxType=${type}&after=${after}`);
};
