import { AArrowUp, MonitorCog, Shrink } from '@boluo/icons';
import { Button } from '@boluo/ui/Button';
import Icon from '@boluo/ui/Icon';
import { LampSwitch } from '@boluo/ui/LampSwitch';
import clsx from 'clsx';
import { type FC, useCallback, useState, type Ref } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSettings } from '../../hooks/useSettings';
import { useMutateSettings } from '../../hooks/useMutateSettings';
import type { ChannelLayout, MessageSize } from '@boluo/common/settings';

interface Props {
  ref: Ref<HTMLDivElement>;
  children: React.ReactNode;
}

export const ChatContentContainer: FC<Props> = ({ children, ref }) => {
  const settings = useSettings();
  const { trigger: updateSettings } = useMutateSettings();
  const messageSize: MessageSize = settings.messageSize ?? 'normal';
  const layout: ChannelLayout = settings.layout ?? 'irc-layout';
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  const toggleMessageSize = useCallback(() => {
    const nextSize: MessageSize = messageSize === 'normal' ? 'large' : 'normal';
    void updateSettings(
      { messageSize: nextSize },
      {
        optimisticData: (current) => ({ ...(current ?? {}), messageSize: nextSize }),
      },
    );
  }, [messageSize, updateSettings]);
  const toggleLayout = useCallback(() => {
    const nextLayout: ChannelLayout = layout === 'compact-layout' ? 'irc-layout' : 'compact-layout';
    void updateSettings(
      { layout: nextLayout },
      {
        optimisticData: (current) => ({ ...(current ?? {}), layout: nextLayout }),
      },
    );
  }, [layout, updateSettings]);
  return (
    <div
      className={clsx('ChatContentView @container relative', layout, `message-text-${messageSize}`)}
      ref={ref}
    >
      <div className="absolute top-0 right-0 z-20 flex items-center gap-1">
        {showLayoutSettings && (
          <>
            <Button
              className="relative"
              small
              aria-pressed={messageSize === 'large'}
              onClick={toggleMessageSize}
            >
              <Icon icon={AArrowUp} />
              <FormattedMessage defaultMessage="Large Text" />
              <LampSwitch isOn={messageSize === 'large'} />
            </Button>
            <Button
              className="relative"
              aria-pressed={layout === 'compact-layout'}
              small
              onClick={toggleLayout}
            >
              <Icon icon={Shrink} />
              <FormattedMessage defaultMessage="Compact" />
              <LampSwitch isOn={layout === 'compact-layout'} />
            </Button>
          </>
        )}
        <button
          className="pressed:opacity-100 text-text-secondary pressed:text-text-primary cursor-pointer p-4 opacity-20 transition-opacity duration-150 hover:opacity-100"
          aria-pressed={showLayoutSettings}
          onClick={() => setShowLayoutSettings((x) => !x)}
        >
          <Icon icon={MonitorCog} />
        </button>
      </div>
      {children}
    </div>
  );
};
