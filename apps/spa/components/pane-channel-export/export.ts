import { Channel } from '@boluo/api';
import type { ExportOptions } from './PaneChannelExport';
import { sleep } from '@boluo/utils';

export const exportChannel = async (channel: Channel, options: ExportOptions) => {
  await sleep(1000);
  throw new Error('Not implemented');
  return [];
};
