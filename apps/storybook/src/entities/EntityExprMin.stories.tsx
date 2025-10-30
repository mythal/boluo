import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EvaluatedExprOf, ExprOf } from '@boluo/api';
import { EntityExprMin } from '@boluo/ui/entities/EntityExprMin';

const baseRoll = {
  type: 'Roll',
  counter: 3,
  face: 10,
  filter: ['LOW', 1],
} satisfies ExprOf<'Roll'>;

const evaluatedRoll = {
  type: 'Roll',
  counter: 3,
  face: 10,
  filter: ['LOW', 1],
  values: [2, 7, 9],
  filtered: [2],
  value: 2,
} satisfies EvaluatedExprOf<'Roll'>;

const unevaluated = {
  type: 'Min',
  node: baseRoll,
} satisfies ExprOf<'Min'>;

const evaluated = {
  type: 'Min',
  node: evaluatedRoll,
  value: 2,
} satisfies EvaluatedExprOf<'Min'>;

const meta: Meta<typeof EntityExprMin> = {
  title: 'Entities/Expr/Min',
  component: EntityExprMin,
};

export default meta;
type Story = StoryObj<typeof EntityExprMin>;

export const Unevaluated: Story = {
  args: {
    node: unevaluated,
  },
};

export const Evaluated: Story = {
  args: {
    node: evaluated,
  },
};
