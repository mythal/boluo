import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd } from '@boluo/ui/Kbd';

const meta: Meta<typeof Kbd> = {
  title: 'Base/Kbd',
  component: Kbd,
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Basic: Story = { args: { children: 'Ctrl' } };

export const Small: Story = { args: { children: 'Ctrl', variant: 'small' } };
