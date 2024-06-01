import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';
import { GreetingHeader } from './GreetingHeader';

interface Props {}

export const PaneWelcome: FC<Props> = () => {
  return (
    <PaneBox
      grow
      header={
        <PaneHeaderBox>
          <FormattedMessage defaultMessage="Welcome" />
        </PaneHeaderBox>
      }
    >
      <div className="p-pane">
        <GreetingHeader />
        <p className="pb-2 pt-8">
          <FormattedMessage defaultMessage="This is Boluo, a chat app designed for tabletop roleplaying games." />
        </p>
        <p className="py-2">
          <FormattedMessage defaultMessage="It's currently in active development and everything is unstable." />
        </p>
      </div>
    </PaneBox>
  );
};
