import type { Meta, StoryObj } from '@storybook/react-vite';
import { ButtonWithLamp } from '@boluo/ui/ButtonWithLamp';
import { fn } from 'storybook/test';

const meta: Meta<typeof ButtonWithLamp> = {
  title: 'Base/ButtonWithLamp',
  component: ButtonWithLamp,
  args: {
    children: 'Server status',
    on: false,
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ButtonWithLamp>;

export const Off: Story = {};

export const On: Story = { args: { on: true } };
