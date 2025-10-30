import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EvaluatedExprOf, ExprOf } from '@boluo/api';
import { EntityExprSubExpr } from '@boluo/ui/entities/EntityExprSubExpr';

const innerNode = {
  type: 'Binary',
  op: '+',
  l: { type: 'Num', value: 2 },
  r: { type: 'Num', value: 3 },
} satisfies ExprOf<'Binary'>;

const pending = {
  type: 'SubExpr',
  node: innerNode,
} satisfies ExprOf<'SubExpr'>;

const evaluated = {
  type: 'SubExpr',
  node: innerNode,
  evaluatedNode: {
    type: 'Binary',
    op: '+',
    l: { type: 'Num', value: 2 },
    r: { type: 'Num', value: 3 },
    value: 5,
  },
  value: 5,
} satisfies EvaluatedExprOf<'SubExpr'>;

const meta: Meta<typeof EntityExprSubExpr> = {
  title: 'Entities/Expr/SubExpr',
  component: EntityExprSubExpr,
};

export default meta;
type Story = StoryObj<typeof EntityExprSubExpr>;

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
