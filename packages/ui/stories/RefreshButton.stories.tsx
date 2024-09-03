import type { Meta, StoryObj } from '@storybook/react';
import { RefreshButton } from '../RefreshButton';

const meta: Meta<typeof RefreshButton> = {
  component: RefreshButton,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof RefreshButton>;

export const Basic: Story = {
  args: {
    children: 'Refresh',
  },
};

export const Small: Story = {
  args: {
    children: 'Refresh',
    small: true,
  },
};
