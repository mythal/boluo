import type { Meta, StoryObj } from '@storybook/react';
import { HelpText } from '../HelpText';

const meta: Meta<typeof HelpText> = {
  component: HelpText,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof HelpText>;

export const Basic: Story = {
  args: {
    children: 'This is a help text',
  },
};
