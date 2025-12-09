import { type MessageSize } from '@boluo/common/settings';
import { MutateSettingsTrigger } from '../../hooks/useMutateSettings';
import { FC } from 'react';
import { Button } from '@boluo/ui/Button';
import Icon from '@boluo/ui/Icon';
import { AArrowUp, Shrink } from '@boluo/icons';
import { FormattedMessage } from 'react-intl';
import { LampSwitch } from '@boluo/ui/LampSwitch';

interface Props {
  messageSize?: MessageSize;
  updateSettings: MutateSettingsTrigger;
}

const NORMAL_MESSAGE_SIZE: MessageSize = 'message-size-normal';
const LARGE_MESSAGE_SIZE: MessageSize = 'message-size-large';

export const ChatContentContainerSettingsSize: FC<Props> = ({ messageSize, updateSettings }) => {
  const toggleMessageSize = () => {
    const nextSize: MessageSize =
      messageSize === NORMAL_MESSAGE_SIZE ? LARGE_MESSAGE_SIZE : NORMAL_MESSAGE_SIZE;
    void updateSettings(
      { messageSize: nextSize },
      {
        optimisticData: (current) => ({ ...current, messageSize: nextSize }),
      },
    );
  };
  return (
    <Button
      className="relative"
      small
      aria-pressed={messageSize === LARGE_MESSAGE_SIZE}
      onClick={toggleMessageSize}
    >
      <Icon icon={AArrowUp} />
      <span className="hidden @xl:inline">
        <FormattedMessage defaultMessage="Large Text" />
      </span>
      <LampSwitch isOn={messageSize === LARGE_MESSAGE_SIZE} />
    </Button>
  );
};
