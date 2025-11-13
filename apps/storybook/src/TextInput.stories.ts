import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextInput } from '@boluo/ui/TextInput';

const meta: Meta<typeof TextInput> = {
  title: 'Base/TextInput',
  component: TextInput,
  argTypes: { variant: { options: ['default', 'error', 'warning'], control: { type: 'radio' } } },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Basic: Story = { args: {} };

export const Error: Story = { args: { variant: 'error' } };

export const Warning: Story = { args: { variant: 'warning' } };
