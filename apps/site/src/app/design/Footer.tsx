'use client';

import { LocaleSelect } from 'chat/components/pane-settings/LocaleSelect';
import { ThemeSelect } from 'chat/components/pane-settings/ThemeSelect';

export const Footer = () => {
  return (
    <footer className="flex justify-center py-2 gap-2">
      <LocaleSelect />
      <ThemeSelect />
    </footer>
  );
};
