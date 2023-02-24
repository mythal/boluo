'use client';

import { LocaleSelect } from '../../components/chat/settings/LocaleSelect';
import { ThemeSelect } from '../../components/chat/settings/ThemeSelect';

export const Footer = () => {
  return (
    <footer className="flex justify-center py-2 gap-2">
      <LocaleSelect />
      <ThemeSelect />
    </footer>
  );
};
