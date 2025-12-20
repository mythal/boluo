import { MonitorCog } from '@boluo/icons';
import Icon from '@boluo/ui/Icon';
import { type FC, useState, type Ref } from 'react';
import { useIntl } from 'react-intl';
import { useSettings } from '../../hooks/useSettings';
import { useMutateSettings } from '@boluo/hooks/useMutateSettings';
import { usePaneIsFocus } from '../../hooks/usePaneIsFocus';
import { ChatContentContainerSettingsFont } from './ChatContentContainerSettingsFont';
import { ChatContentContainerSettingsLayout } from './ChatContentContainerSettingsLayout';
import { ChatContentContainerSettingsSize } from './ChatContentContainerSettingsSize';
import { settingsToClassnames } from '../../hooks/useChatContainerClassnames';

interface Props {
  ref: Ref<HTMLDivElement>;
  children: React.ReactNode;
}

export const ChatContentContainer: FC<Props> = ({ children, ref }) => {
  const focused = usePaneIsFocus();
  const settings = useSettings();
  const { trigger: updateSettings } = useMutateSettings();
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  const intl = useIntl();
  const settingsButtonLabel = intl.formatMessage({ defaultMessage: 'Messages Display Settings' });
  const classNames = settingsToClassnames(settings);

  return (
    <div className={`ChatContentContainer @container relative ${classNames}`} ref={ref}>
      {focused && (
        <div className="absolute top-0 right-0.5 z-20 flex items-center gap-1">
          {showLayoutSettings && (
            <>
              <ChatContentContainerSettingsFont
                inGameFont={settings.inGameFont}
                updateSettings={updateSettings}
              />
              <ChatContentContainerSettingsSize
                messageSize={settings.messageSize}
                updateSettings={updateSettings}
              />
              <ChatContentContainerSettingsLayout
                layout={settings.layout}
                updateSettings={updateSettings}
              />
            </>
          )}
          <button
            className="pressed:opacity-100 text-text-primary pressed:text-brand-strong cursor-pointer p-2.5 opacity-20 transition-opacity duration-150 hover:opacity-100"
            aria-pressed={showLayoutSettings}
            onClick={() => setShowLayoutSettings((x) => !x)}
            aria-label={settingsButtonLabel}
            title={settingsButtonLabel}
          >
            <Icon icon={MonitorCog} />
          </button>
        </div>
      )}
      {children}
    </div>
  );
};
