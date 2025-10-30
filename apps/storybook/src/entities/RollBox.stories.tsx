import type { Meta, StoryObj } from '@storybook/react-vite';
import { RollBox } from '@boluo/ui/entities/RollBox';

const meta: Meta<typeof RollBox> = {
  title: 'Entities/RollBox',
  component: RollBox,
  args: {
    children: '1d20 + 5',
  },
};

export default meta;
type Story = StoryObj<typeof RollBox>;

export const Default: Story = {};

export const LongExpression: Story = {
  args: {
    children: '2d6 + 1d4 + 3 (advantage)',
  },
};
