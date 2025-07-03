import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@boluo/ui/Badge';

const meta: Meta<typeof Badge> = { component: Badge };

export default meta;
type Story = StoryObj<typeof Badge>;

export const Basic: Story = { args: { children: 'New' } };
