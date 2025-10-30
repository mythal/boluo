import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EvaluatedExprOf, ExprOf } from '@boluo/api';
import { EntityExprDicePoolRoll } from '@boluo/ui/entities/EntityExprDicePool';

const pending = {
  type: 'DicePool',
  counter: 4,
  face: 6,
  min: 3,
  addition: 1,
  critical: 6,
  fumble: 1,
} satisfies ExprOf<'DicePool'>;

const evaluated = {
  type: 'DicePool',
  counter: 4,
  face: 6,
  min: 3,
  addition: 1,
  critical: 6,
  fumble: 1,
  values: [6, 4, 3, 2],
  value: 3,
} satisfies EvaluatedExprOf<'DicePool'>;

const meta: Meta<typeof EntityExprDicePoolRoll> = {
  title: 'Entities/Expr/DicePool',
  component: EntityExprDicePoolRoll,
};

export default meta;
type Story = StoryObj<typeof EntityExprDicePoolRoll>;

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
