import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EvaluatedExprOf, ExprOf } from '@boluo/api';
import { EntityExprBinary } from '@boluo/ui/entities/EntityExprBinary';
import { IsTopLevelContext } from '@boluo/ui/entities/top-level';

const unevaluated = {
  type: 'Binary',
  op: '+',
  l: { type: 'Num', value: 4 },
  r: {
    type: 'Roll',
    counter: 2,
    face: 6,
    filter: null,
  },
} satisfies ExprOf<'Binary'>;

const evaluated = {
  type: 'Binary',
  op: '+',
  l: {
    type: 'Roll',
    counter: 2,
    face: 6,
    filter: ['HIGH', 1],
    values: [5, 2],
    filtered: [5],
    value: 10,
  },
  r: { type: 'Num', value: 3 },
  value: 13,
} satisfies EvaluatedExprOf<'Binary'>;

const meta: Meta<typeof EntityExprBinary> = {
  title: 'Entities/Expr/Binary',
  component: EntityExprBinary,
};

export default meta;
type Story = StoryObj<typeof EntityExprBinary>;

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

export const NestedEvaluated: Story = {
  args: {
    node: evaluated,
  },
  render: (args) => (
    <IsTopLevelContext value={false}>
      <EntityExprBinary {...args} />
    </IsTopLevelContext>
  ),
};
