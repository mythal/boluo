import type { Meta, StoryObj } from '@storybook/react-vite';
import { DiceSelect } from '@boluo/ui/DiceSelect';
import { fn } from 'storybook/test';

const meta: Meta<typeof DiceSelect> = {
  title: 'Derived/DiceSelect',
  component: DiceSelect,
};

export default meta;
type Story = StoryObj<typeof DiceSelect>;

export const Basic: Story = { args: { value: 'd20', onChange: fn() } };
