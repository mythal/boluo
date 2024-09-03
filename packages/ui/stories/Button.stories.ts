import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';

const meta: Meta<typeof Button> = {
  component: Button,
  argTypes: {
    'data-small': {
      control: {
        type: 'boolean',
      },
    },
    'data-type': {
      control: {
        type: 'select',
        options: ['primary', 'default', 'danger', 'detail'],
      },
    },
    'data-active': {
      control: {
        type: 'boolean',
      },
    },
    'data-on': {
      control: {
        type: 'boolean',
      },
    },
  },
  args: {
    children: 'Click me',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Basic: Story = {
  args: {},
};
