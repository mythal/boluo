import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EvaluatedExpr } from '@boluo/api';
import { EntityEvaluatedExpr } from '@boluo/ui/entities/EntityEvaluatedExpr';

const source = '1 + 2 × 3';

const entity = {
  type: 'EvaluatedExpr',
  start: 0,
  len: source.length,
  node: {
    type: 'Binary',
    op: '+',
    l: { type: 'Num', value: 1 },
    r: {
      type: 'Binary',
      op: '×',
      l: { type: 'Num', value: 2 },
      r: { type: 'Num', value: 3 },
      value: 6,
    },
    value: 7,
  },
} satisfies EvaluatedExpr;

const meta: Meta<typeof EntityEvaluatedExpr> = {
  title: 'Entities/Expr/EvaluatedExpr',
  component: EntityEvaluatedExpr,
  args: {
    source,
    entity,
  },
};

export default meta;
type Story = StoryObj<typeof EntityEvaluatedExpr>;

export const Basic: Story = {};
