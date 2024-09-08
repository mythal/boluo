import type { Meta, StoryObj } from '@storybook/react';
import { ComposeFallback } from '../../ComposeFallback';

const meta: Meta<typeof ComposeFallback> = {
  component: ComposeFallback,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    source: {
      control: 'text',
    },
  },
  render: (args) => (
    <div className="h-full w-full">
      <div className="p-8 text-center">...</div>
      <ComposeFallback {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof ComposeFallback>;

export const Basic: Story = {
  args: {
    source: 'Compose Fallback',
  },
};

export const Empty: Story = {
  args: {
    source: '',
  },
};
