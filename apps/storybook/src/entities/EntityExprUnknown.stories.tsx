import type { Meta, StoryObj } from '@storybook/react-vite';
import { EntityExprNodeUnknown } from '@boluo/ui/entities/EntityExprUnknown';

const meta: Meta<typeof EntityExprNodeUnknown> = {
  title: 'Entities/Expr/Unknown',
  component: EntityExprNodeUnknown,
};

export default meta;
type Story = StoryObj<typeof EntityExprNodeUnknown>;

export const Basic: Story = {};
