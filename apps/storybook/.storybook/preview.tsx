import type { Preview } from '@storybook/react-vite';
import '@boluo/tailwind-config';
import { IntlProvider } from 'react-intl';
import React from 'react';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export const decorators = [
  (Story: React.FC) => (
    <IntlProvider locale="en">
      <Story />
    </IntlProvider>
  ),
];
export default preview;
