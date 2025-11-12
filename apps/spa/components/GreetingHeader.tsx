import { type FC } from 'react';
import { ThemeSelect } from './pane-settings/ThemeSelect';
import { FormattedMessage } from 'react-intl';
import { LocaleSelect } from './pane-settings/LocaleSelect';

export const GreetingHeader: FC = () => {
  return (
    <div className="GreetingHeader flex justify-end gap-4 text-sm">
      <label className="flex items-baseline gap-2">
        <span className="flex-none">
          <FormattedMessage defaultMessage="Theme" />
        </span>
        <ThemeSelect />
      </label>

      <label className="flex items-baseline gap-2">
        <span className="flex-none">
          <FormattedMessage defaultMessage="Language" />
        </span>
        <LocaleSelect />
      </label>
    </div>
  );
};
