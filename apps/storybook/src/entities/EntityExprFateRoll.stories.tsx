import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EvaluatedExprOf, ExprOf } from '@boluo/api';
import { EntityExprFateRoll } from '@boluo/ui/entities/EntityExprFateRoll';

const pending = {
  type: 'FateRoll',
} satisfies ExprOf<'FateRoll'>;

const evaluated = {
  type: 'FateRoll',
  value: 2,
  values: [1, 0, 1, 0],
} satisfies EvaluatedExprOf<'FateRoll'>;

const meta: Meta<typeof EntityExprFateRoll> = {
  title: 'Entities/Expr/FateRoll',
  component: EntityExprFateRoll,
};

export default meta;
type Story = StoryObj<typeof EntityExprFateRoll>;

export const Pending: Story = {
  args: {
    node: pending,
  },
};

export const Evaluated: Story = {
  args: {
    node: evaluated,
  },
};
