import { HelpCircle } from 'icons';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { ClosePaneButton } from './ClosePaneButton';
import { PaneBodyBox } from './PaneBodyBox';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';

interface Props {
}

export const PaneHelp: FC<Props> = () => {
  return (
    <PaneBox>
      <PaneHeaderBox operators={<ClosePaneButton />} icon={<HelpCircle />}>
        <FormattedMessage defaultMessage="Help" />
      </PaneHeaderBox>
      <PaneBodyBox className="p-4">
        Coming soon
      </PaneBodyBox>
    </PaneBox>
  );
};
