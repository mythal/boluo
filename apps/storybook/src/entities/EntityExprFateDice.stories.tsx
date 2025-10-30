import type { Meta, StoryObj } from '@storybook/react-vite';
import { EntityExprFateDice } from '@boluo/ui/entities/EntityExprFateDice';

const meta: Meta<typeof EntityExprFateDice> = {
  title: 'Entities/Expr/FateDice',
  component: EntityExprFateDice,
};

export default meta;
type Story = StoryObj<typeof EntityExprFateDice>;

export const Variants: Story = {
  render: () => (
    <div className="flex items-end gap-2">
      <EntityExprFateDice value={-1} />
      <EntityExprFateDice value={0} />
      <EntityExprFateDice value={1} />
      <EntityExprFateDice value={null} />
    </div>
  ),
};
