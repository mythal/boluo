import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';
import React from 'react';
import { IntlProvider } from 'react-intl';
import '../tailwind.css';
const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export const decorators = [
  (Story) => (
    <IntlProvider locale="en">
      <Story />
    </IntlProvider>
  ),
  withThemeByClassName({
    themes: {
      light: 'light',
      dark: 'dark',
    },
    defaultTheme: 'light',
  }),
];

export default preview;
