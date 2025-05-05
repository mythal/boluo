import type { Meta, StoryObj } from '@storybook/react';
import { HelpText } from '@boluo/ui/HelpText';

const meta: Meta<typeof HelpText> = { component: HelpText };

export default meta;
type Story = StoryObj<typeof HelpText>;

export const Basic: Story = { args: { children: 'This is a help text' } };
