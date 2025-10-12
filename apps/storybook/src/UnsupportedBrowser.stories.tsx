import type { Meta, StoryObj } from '@storybook/react-vite';
import { UnsupportedBrowser } from '@boluo/ui/UnsupportedBrowser';

const meta: Meta<typeof UnsupportedBrowser> = {
  title: 'Feedback/UnsupportedBrowser',
  component: UnsupportedBrowser,
  decorators: [(Story) => <Story />],
};

export default meta;

type Story = StoryObj<typeof UnsupportedBrowser>;

export const Desktop: Story = {
  args: { isIos: false },
};

export const Ios: Story = {
  name: 'iOS',
  args: { isIos: true },
};
