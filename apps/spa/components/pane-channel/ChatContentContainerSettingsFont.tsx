import { type InGameFont } from '@boluo/settings';
import { Button } from '@boluo/ui/Button';
import { useTooltip } from '@boluo/ui/hooks/useTooltip';
import { LampSwitch } from '@boluo/ui/LampSwitch';
import { TooltipBox } from '@boluo/ui/TooltipBox';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { type MutateSettingsTrigger } from '@boluo/hooks/useMutateSettings';
import { useAtomValue } from 'jotai';
import { devMode } from '../../state/dev.atoms';

interface Props {
  inGameFont?: InGameFont;
  updateSettings: MutateSettingsTrigger;
}

export const ChatContentContainerSettingsFont: FC<Props> = ({ inGameFont, updateSettings }) => {
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } =
    useTooltip('bottom-start');
  const enabled = inGameFont === 'in-game-serif';

  const toggleSerifFont = () => {
    const nextFont: InGameFont =
      inGameFont === 'in-game-serif' ? 'in-game-sans-serif' : 'in-game-serif';
    void updateSettings(
      { inGameFont: nextFont },
      {
        optimisticData: (current) => ({ ...current, inGameFont: nextFont }),
      },
    );
  };
  const isDev = useAtomValue(devMode);
  if (!isDev) {
    return null;
  }
  return (
    <>
      <Button
        small
        aria-pressed={enabled}
        className="relative"
        ref={refs.setReference}
        onClick={toggleSerifFont}
        {...getReferenceProps()}
      >
        <span className="font-old">
          <FormattedMessage defaultMessage="Serif" />
        </span>
        <LampSwitch isOn={enabled} />
      </Button>
      <TooltipBox
        show={showTooltip}
        style={floatingStyles}
        ref={refs.setFloating}
        {...getFloatingProps()}
        defaultStyle
      >
        <FormattedMessage defaultMessage="Switch to serif font for In-Game messages." />
      </TooltipBox>
    </>
  );
};
