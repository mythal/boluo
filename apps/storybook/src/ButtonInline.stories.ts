import type { Meta, StoryObj } from '@storybook/react';
import { ButtonInline } from '@boluo/ui/ButtonInline';

const meta: Meta<typeof ButtonInline> = { component: ButtonInline, args: { children: 'Click me' } };

export default meta;
type Story = StoryObj<typeof ButtonInline>;

export const Basic: Story = { args: {} };
