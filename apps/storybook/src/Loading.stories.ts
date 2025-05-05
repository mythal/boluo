import type { Meta, StoryObj } from '@storybook/react';
import { Loading } from '@boluo/ui/Loading';

const meta: Meta<typeof Loading> = { component: Loading };

export default meta;
type Story = StoryObj<typeof Loading>;

export const Inline: Story = { args: { type: 'inline' } };

export const Block: Story = { args: { type: 'block' } };
