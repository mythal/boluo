import type { Meta, StoryObj } from '@storybook/react';
import { ComposeFallback } from '../../ComposeFallback';

const meta: Meta<typeof ComposeFallback> = {
  component: ComposeFallback,
  argTypes: {
    source: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ComposeFallback>;

export const Basic: Story = {
  args: {
    source: 'Compose Fallback',
  },
};
