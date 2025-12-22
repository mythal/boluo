import HelpCircle from '@boluo/icons/HelpCircle';
import { useState, type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';
import { devMode } from '../state/dev.atoms';
import { useAtomValue } from 'jotai';
import { Button } from '@boluo/ui/Button';

export const PaneHelp: FC = () => {
  const dev = useAtomValue(devMode);
  const [crashOnRendering, setCrashOnRendering] = useState(false);
  if (crashOnRendering) {
    throw new Error('Crash on rendering');
  }
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<HelpCircle />}>
          <FormattedMessage defaultMessage="Help" />
        </PaneHeaderBox>
      }
    >
      <div className="p-pane">
        Coming soon
        {dev && (
          <div className="flex gap-1">
            <Button
              onClick={() => {
                throw new Error('Crash!');
              }}
            >
              Crash!
            </Button>
            <Button onClick={() => setCrashOnRendering(true)}>Crash on rendering</Button>
          </div>
        )}
      </div>
    </PaneBox>
  );
};

export default PaneHelp;
