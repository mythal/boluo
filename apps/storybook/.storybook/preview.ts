import type { Preview } from '@storybook/react';
import '@boluo/ui/tailwind.css';

const preview: Preview = {
  parameters: { controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } } },
};

export default preview;
