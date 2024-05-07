import { HelpCircle } from '@boluo/icons';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { ClosePaneButton } from './ClosePaneButton';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';
import { devMode } from '../state/dev.atoms';
import { useAtomValue } from 'jotai';

interface Props {}

export const PaneHelp: FC<Props> = () => {
  const dev = useAtomValue(devMode);
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<HelpCircle />}>
          <FormattedMessage defaultMessage="Help" />
        </PaneHeaderBox>
      }
    >
      <div className="p-pane">Coming soon</div>

      {dev && (
        <div>
          <button
            onClick={() => {
              throw new Error('Crash!');
            }}
          >
            Crash!
          </button>
        </div>
      )}
    </PaneBox>
  );
};

export default PaneHelp;
