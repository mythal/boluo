import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EvaluatedExprOf, ExprOf } from '@boluo/api';
import { EntityExprMax } from '@boluo/ui/entities/EntityExprMax';

const baseRoll = {
  type: 'Roll',
  counter: 4,
  face: 6,
  filter: ['HIGH', 2],
} satisfies ExprOf<'Roll'>;

const evaluatedRoll = {
  type: 'Roll',
  counter: 4,
  face: 6,
  filter: ['HIGH', 2],
  values: [6, 5, 3, 2],
  filtered: [6, 5],
  value: 11,
} satisfies EvaluatedExprOf<'Roll'>;

const unevaluated = {
  type: 'Max',
  node: baseRoll,
} satisfies ExprOf<'Max'>;

const evaluated = {
  type: 'Max',
  node: evaluatedRoll,
  value: 11,
} satisfies EvaluatedExprOf<'Max'>;

const meta: Meta<typeof EntityExprMax> = {
  title: 'Entities/Expr/Max',
  component: EntityExprMax,
};

export default meta;
type Story = StoryObj<typeof EntityExprMax>;

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
