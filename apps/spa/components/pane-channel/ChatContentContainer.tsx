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
import { usePaneIsFocus } from '../../hooks/usePaneIsFocus';
import { ChannelLayoutContext } from '../../hooks/useChannelLayout';
import { MessageSizeContext } from '../../hooks/useMessageSize';

interface Props {
  ref: Ref<HTMLDivElement>;
  children: React.ReactNode;
}

const NORMAL_MESSAGE_SIZE: MessageSize = 'message-size-normal';
const LARGE_MESSAGE_SIZE: MessageSize = 'message-size-large';

export const ChatContentContainer: FC<Props> = ({ children, ref }) => {
  const focused = usePaneIsFocus();
  const settings = useSettings();
  const { trigger: updateSettings } = useMutateSettings();
  const messageSize: MessageSize = settings.messageSize ?? NORMAL_MESSAGE_SIZE;
  const layout: ChannelLayout = settings.layout ?? 'irc-layout';
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  const toggleMessageSize = useCallback(() => {
    const nextSize: MessageSize =
      messageSize === NORMAL_MESSAGE_SIZE ? LARGE_MESSAGE_SIZE : NORMAL_MESSAGE_SIZE;
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
    <ChannelLayoutContext value={layout}>
      <MessageSizeContext value={messageSize}>
        <div className={clsx('ChatContentView @container relative', layout, messageSize)} ref={ref}>
          {focused && (
            <div className="absolute top-0 right-0 z-20 flex items-center gap-1">
              {showLayoutSettings && (
                <>
                  <Button
                    className="relative"
                    small
                    aria-pressed={messageSize === LARGE_MESSAGE_SIZE}
                    onClick={toggleMessageSize}
                  >
                    <Icon icon={AArrowUp} />
                    <FormattedMessage defaultMessage="Large Text" />
                    <LampSwitch isOn={messageSize === LARGE_MESSAGE_SIZE} />
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
                className="pressed:opacity-100 text-text-primary pressed:text-brand-strong cursor-pointer p-2.5 opacity-20 transition-opacity duration-150 hover:opacity-100"
                aria-pressed={showLayoutSettings}
                onClick={() => setShowLayoutSettings((x) => !x)}
              >
                <Icon icon={MonitorCog} />
              </button>
            </div>
          )}
          {children}
        </div>
      </MessageSizeContext>
    </ChannelLayoutContext>
  );
};
