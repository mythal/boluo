import type { Meta, StoryObj } from '@storybook/react';
import { Kbd } from '@boluo/ui/Kbd';

const meta: Meta<typeof Kbd> = { component: Kbd };

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Basic: Story = { args: { children: 'Ctrl' } };
