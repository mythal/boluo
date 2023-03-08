import type { Meta, StoryObj } from '@storybook/react';

import { Button } from 'ui';

// More on how to set up stories at: https://storybook.js.org/docs/7.0/react/writing-stories/introduction
const meta = {
  title: 'Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/7.0/react/writing-stories/args
export const Normal: Story = {
  args: {
    children: 'Button',
    'data-type': 'default',
    'data-small': false,
    'data-active': false,
  },
};
