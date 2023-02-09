'use client';

import { LocaleSelect } from '../../components/chat/settings/LocaleSelect';

export const Footer = () => {
  return (
    <footer className="flex justify-center py-2">
      <LocaleSelect />
    </footer>
  );
};
