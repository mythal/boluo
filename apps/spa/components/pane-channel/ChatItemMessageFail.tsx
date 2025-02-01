import { type FC } from 'react';
import { type FailTo } from '../../state/channel.types';
import { Delay } from '../Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';
import { TriangleAlert } from '@boluo/icons';

export const ChatItemMessageFail: FC<{ failTo: FailTo }> = ({}) => {
  return (
    <div className="relative">
      <Delay fallback={<FallbackIcon />}>
        <TriangleAlert className="text-text-danger inline text-xs" />
      </Delay>
      {/* TODO: Style */}
      <div className="bg-lowest absolute bottom-full left-0 z-10 rounded-lg border px-2 py-1 shadow">Fail</div>
    </div>
  );
};
