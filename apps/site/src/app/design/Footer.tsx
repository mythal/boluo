'use client';

import { LocaleSelect } from 'chat/src/components/settings/LocaleSelect';
import { ThemeSelect } from 'chat/src/components/settings/ThemeSelect';

export const Footer = () => {
  return (
    <footer className="flex justify-center py-2 gap-2">
      <LocaleSelect />
      <ThemeSelect />
    </footer>
  );
};
