import type { Preview } from '@storybook/react-vite';
import '@boluo/ui/tailwind.css';
import { IntlProvider } from 'react-intl';
import React from 'react';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export const decorators = [
  (Story) => (
    <IntlProvider locale="en">
      <Story />
    </IntlProvider>
  ),
];
export default preview;
