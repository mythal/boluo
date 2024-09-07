import type { Meta, StoryObj } from '@storybook/react';
import { UnsupportedBrowser } from '../../UnsupportedBrowser';

const meta: Meta<typeof UnsupportedBrowser> = {
  component: UnsupportedBrowser,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    siteUrl: 'https://example.com',
  },
};

export default meta;
type Story = StoryObj<typeof UnsupportedBrowser>;

export const Basic: Story = {
  args: {
    isIos: false,
  },
};

export const Ios: Story = {
  args: {
    isIos: true,
    siteUrl: null,
  },
};
Ios.storyName = 'iOS';
