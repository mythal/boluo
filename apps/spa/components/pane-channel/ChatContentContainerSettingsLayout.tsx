import { type ChannelLayout } from '@boluo/settings';
import { type MutateSettingsTrigger } from '../../hooks/useMutateSettings';
import { type FC } from 'react';
import { Button } from '@boluo/ui/Button';
import Icon from '@boluo/ui/Icon';
import { Shrink } from '@boluo/icons';
import { FormattedMessage } from 'react-intl';
import { LampSwitch } from '@boluo/ui/LampSwitch';

interface Props {
  layout?: ChannelLayout;
  updateSettings: MutateSettingsTrigger;
}

export const ChatContentContainerSettingsLayout: FC<Props> = ({ layout, updateSettings }) => {
  const toggleLayout = () => {
    const nextLayout: ChannelLayout = layout === 'compact-layout' ? 'irc-layout' : 'compact-layout';
    void updateSettings(
      { layout: nextLayout },
      {
        optimisticData: (current) => ({ ...current, layout: nextLayout }),
      },
    );
  };
  return (
    <Button
      className="relative"
      aria-pressed={layout === 'compact-layout'}
      small
      onClick={toggleLayout}
    >
      <Icon icon={Shrink} />
      <span className="hidden @xl:inline">
        <FormattedMessage defaultMessage="Compact" />
      </span>
      <LampSwitch isOn={layout === 'compact-layout'} />
    </Button>
  );
};
