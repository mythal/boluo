import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EvaluatedExprOf, ExprOf } from '@boluo/api';
import { EntityExprCocRoll } from '@boluo/ui/entities/EntityExprCocRoll';

const pending = {
  type: 'CocRoll',
  subType: 'BONUS',
  target: { type: 'Num', value: 65 },
} satisfies ExprOf<'CocRoll'>;

const evaluated = {
  type: 'CocRoll',
  subType: 'BONUS',
  target: { type: 'Num', value: 65 },
  targetValue: 65,
  value: 32,
  rolled: 32,
  modifiers: [2, -1],
} satisfies EvaluatedExprOf<'CocRoll'>;

const meta: Meta<typeof EntityExprCocRoll> = {
  title: 'Entities/Expr/CocRoll',
  component: EntityExprCocRoll,
};

export default meta;
type Story = StoryObj<typeof EntityExprCocRoll>;

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
