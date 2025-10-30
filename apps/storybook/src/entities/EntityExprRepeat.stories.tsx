import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EvaluatedExprOf, ExprOf } from '@boluo/api';
import { EntityExprRepeat } from '@boluo/ui/entities/EntityExprRepeat';

const pending = {
  type: 'Repeat',
  node: { type: 'Roll', counter: 1, face: 6 },
  count: 3,
} satisfies ExprOf<'Repeat'>;

const evaluated = {
  type: 'Repeat',
  node: { type: 'Roll', counter: 1, face: 6 },
  count: 3,
  evaluated: [
    { type: 'Roll', counter: 1, face: 6, values: [4], value: 4 },
    { type: 'Roll', counter: 1, face: 6, values: [1], value: 1 },
    { type: 'Roll', counter: 1, face: 6, values: [6], value: 6 },
  ],
  value: 11,
} satisfies EvaluatedExprOf<'Repeat'>;

const meta: Meta<typeof EntityExprRepeat> = {
  title: 'Entities/Expr/Repeat',
  component: EntityExprRepeat,
};

export default meta;
type Story = StoryObj<typeof EntityExprRepeat>;

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
