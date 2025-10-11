import type { Preview } from '@storybook/react-vite';
import '@boluo/tailwind-config';
import { IntlProvider } from 'react-intl';
import { withThemeByClassName, withThemeByDataAttribute } from '@storybook/addon-themes';
import React from 'react';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export const decorators = [
  withThemeByDataAttribute({
    themes: {
      light: 'light',
      dark: 'dark',
    },
    defaultTheme: 'light',
  }),
  (Story: React.FC) => (
    <IntlProvider locale="en">
      <Story />
    </IntlProvider>
  ),
];
export default preview;
