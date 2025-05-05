import type { Meta, StoryObj } from '@storybook/react';
import { RefreshButton } from '@boluo/ui/RefreshButton';

const meta: Meta<typeof RefreshButton> = { component: RefreshButton };

export default meta;
type Story = StoryObj<typeof RefreshButton>;

export const Basic: Story = { args: { children: 'Refresh' } };

export const Small: Story = { args: { children: 'Refresh', small: true } };
