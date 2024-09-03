import type { Meta, StoryObj } from '@storybook/react';

import { FloatingBox } from '../FloatingBox';

const meta: Meta<typeof FloatingBox> = {
  component: FloatingBox,
};

export default meta;
type Story = StoryObj<typeof FloatingBox>;

export const Basic: Story = {
  args: {
    children: 'This is a floating box',
  },
};
