import type { Meta, StoryObj } from '@storybook/react';
import { Kbd } from '../Kbd';

const meta = {
  component: Kbd,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Basic: Story = {
  args: {
    children: 'Ctrl',
  },
};
