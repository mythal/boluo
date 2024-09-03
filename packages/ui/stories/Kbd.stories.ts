import type { Meta, StoryObj } from '@storybook/react';
import { Kbd } from '../Kbd';

const meta: Meta<typeof Kbd> = {
  component: Kbd,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Basic: Story = {
  args: {
    children: 'Ctrl',
  },
};
