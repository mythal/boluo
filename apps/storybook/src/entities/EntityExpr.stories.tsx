import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ExprEntity } from '@boluo/api';
import { EntityExpr } from '@boluo/ui/entities/EntityExpr';

const source = '2d6 + 3';

const entity = {
  start: 0,
  len: source.length,
  node: {
    type: 'Binary',
    op: '+',
    l: {
      type: 'Roll',
      counter: 2,
      face: 6,
      filter: null,
    },
    r: { type: 'Num', value: 3 },
  },
} satisfies ExprEntity;

const meta: Meta<typeof EntityExpr> = {
  title: 'Entities/Expr',
  component: EntityExpr,
  args: {
    source,
    entity,
  },
};

export default meta;
type Story = StoryObj<typeof EntityExpr>;

export const Basic: Story = {};
