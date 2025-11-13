import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EvaluatedExprOf, ExprNode } from '@boluo/api';
import { EntityExprNode } from '@boluo/ui/entities/EntityExprNode';
import { IsTopLevelContext } from '@boluo/ui/entities/top-level';

const binaryNode = {
  type: 'Binary',
  op: '-',
  l: { type: 'Num', value: 12 },
  r: { type: 'Num', value: 5 },
} satisfies ExprNode;

const rollResult = {
  type: 'Roll',
  counter: 3,
  face: 6,
  values: [6, 4, 1],
  value: 11,
} satisfies EvaluatedExprOf<'Roll'>;

const repeatResult = {
  type: 'Repeat',
  node: { type: 'Roll', counter: 1, face: 6 },
  count: 3,
  evaluated: [
    { type: 'Roll', counter: 1, face: 6, values: [4], value: 4 },
    { type: 'Roll', counter: 1, face: 6, values: [2], value: 2 },
    { type: 'Roll', counter: 1, face: 6, values: [5], value: 5 },
  ],
  value: 11,
} satisfies EvaluatedExprOf<'Repeat'>;

const meta: Meta<typeof EntityExprNode> = {
  title: 'Entities/Expr/Node',
  component: EntityExprNode,
};

export default meta;
type Story = StoryObj<typeof EntityExprNode>;

export const Binary: Story = {
  args: {
    node: binaryNode,
  },
};

export const RollResult: Story = {
  args: {
    node: rollResult,
  },
};

export const RepeatResult: Story = {
  args: {
    node: repeatResult,
  },
};

export const NestedUnknown: Story = {
  args: {
    node: { type: 'Unknown' },
  },
  render: (args) => (
    <IsTopLevelContext value={false}>
      <EntityExprNode {...args} />
    </IsTopLevelContext>
  ),
};
