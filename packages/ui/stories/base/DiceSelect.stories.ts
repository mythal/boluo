import type { Meta, StoryObj } from '@storybook/react';
import { DiceSelect } from '../../DiceSelect';
import { fn } from '@storybook/test';

const meta: Meta<typeof DiceSelect> = {
  component: DiceSelect,
};

export default meta;
type Story = StoryObj<typeof DiceSelect>;

export const Basic: Story = {
  args: {
    value: 'd20',
    onChange: fn(),
  },
};
