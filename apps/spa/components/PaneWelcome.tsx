import { type FC, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';

interface Props {}

export const Para = ({ children }: { children: ReactNode }) => <div className="py-2">{children}</div>;

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
        <Para>
          <FormattedMessage defaultMessage="This is Boluo, a chat app designed for tabletop roleplaying games." />
        </Para>
        <Para>
          <FormattedMessage defaultMessage="It's currently in active development and everything is unstable." />
        </Para>
      </div>
    </PaneBox>
  );
};
