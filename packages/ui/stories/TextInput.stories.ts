import type { Meta, StoryObj } from '@storybook/react';
import { TextInput } from '../TextInput';

const meta: Meta<typeof TextInput> = {
  component: TextInput,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      options: ['default', 'error', 'warning'],
      control: { type: 'radio' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Basic: Story = {
  args: {},
};

export const Error: Story = {
  args: {
    variant: 'error',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
  },
};
