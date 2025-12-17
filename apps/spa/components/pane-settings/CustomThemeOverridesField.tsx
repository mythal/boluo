import { type FC, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { ButtonWithLamp } from '@boluo/ui/ButtonWithLamp';
import { HelpText } from '@boluo/ui/HelpText';
import { TextArea } from '@boluo/ui/TextInput';
import { useSettings } from '../../hooks/useSettings';
import { useMutateSettings } from '@boluo/hooks/useMutateSettings';
import type { Settings } from '@boluo/settings';

const normalizeSettings = (settings: Settings) => {
  const css = settings.customThemeCss ?? '';
  const enabled = Boolean(settings.customThemeEnabled && css.trim());
  return { css, enabled };
};

export const CustomThemeOverridesField: FC = () => {
  const settings = useSettings();
  const { trigger: updateSettings, isMutating } = useMutateSettings();
  const { css: cssFromSettings, enabled: enabledFromSettings } = useMemo(
    () => normalizeSettings(settings),
    [settings],
  );
  const [customCss, setCustomCss] = useState(cssFromSettings);
  const [enabled, setEnabled] = useState(enabledFromSettings);

  const trimmedCss = customCss.trim();
  const nextEnabled = trimmedCss ? true : enabled;
  const hasChanges = useMemo(() => {
    return trimmedCss !== cssFromSettings || nextEnabled !== enabledFromSettings;
  }, [cssFromSettings, enabledFromSettings, nextEnabled, trimmedCss]);

  const handleSave = () => {
    const payload: Partial<Settings> = {
      customThemeCss: trimmedCss,
      customThemeEnabled: nextEnabled,
    };
    setEnabled(nextEnabled);
    void updateSettings(payload, {
      optimisticData: (current) => ({ ...(current ?? {}), ...payload }),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <div className="font-medium">
            <FormattedMessage defaultMessage="Custom theme overrides" />
          </div>
          <HelpText>
            <FormattedMessage defaultMessage="Paste CSS variables or any custom CSS to override the theme." />
          </HelpText>
        </div>
        <ButtonWithLamp on={enabled} onClick={() => setEnabled(!enabled)}>
          <FormattedMessage defaultMessage="Enable overrides" />
        </ButtonWithLamp>
      </div>
      <TextArea
        className="min-h-40 w-full font-mono"
        value={customCss}
        onChange={(event) => setCustomCss(event.target.value)}
        placeholder="--color-surface-default: #f6f9f4; --color-pane-bg: #333;"
      />
      <div className="flex items-center justify-between gap-4">
        <div className="text-text-muted text-sm">
          <FormattedMessage
            defaultMessage="See the <link>source</link> for reference — PRs welcome!"
            values={{
              link: (chunks) => (
                <a
                  className="underline"
                  target="_blank"
                  href="https://github.com/mythal/boluo/blob/master/packages/tailwind-config/theme.tailwind.css"
                  rel="noreferrer"
                >
                  {chunks}
                </a>
              ),
            }}
          />
        </div>
        <Button onClick={handleSave} disabled={isMutating || !hasChanges}>
          <FormattedMessage defaultMessage="Apply" />
        </Button>
      </div>
    </div>
  );
};
