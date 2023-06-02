import { HelpCircle } from 'icons';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { ClosePaneButton } from './ClosePaneButton';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';

interface Props {
}

export const PaneHelp: FC<Props> = () => {
  return (
    <PaneBox
      header={
        <PaneHeaderBox operators={<ClosePaneButton />} icon={<HelpCircle />}>
          <FormattedMessage defaultMessage="Help" />
        </PaneHeaderBox>
      }
    >
      <div className="p-4">
        Coming soon
      </div>
    </PaneBox>
  );
};

export default PaneHelp;
