import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EvaluatedExprOf, ExprOf } from '@boluo/api';
import { EntityExprRoll } from '@boluo/ui/entities/EntityExprRoll';

const pending = {
  type: 'Roll',
  counter: 2,
  face: 20,
  filter: ['HIGH', 1],
} satisfies ExprOf<'Roll'>;

const evaluated = {
  type: 'Roll',
  counter: 3,
  face: 6,
  values: [6, 3, 2],
  filtered: [6],
  value: 9,
  filter: ['HIGH', 1],
} satisfies EvaluatedExprOf<'Roll'>;

const meta: Meta<typeof EntityExprRoll> = {
  title: 'Entities/Expr/Roll',
  component: EntityExprRoll,
};

export default meta;
type Story = StoryObj<typeof EntityExprRoll>;

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
