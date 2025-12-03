import type { Meta, StoryObj } from '@storybook/react-vite';
import { ButtonInline } from '@boluo/ui/ButtonInline';

const meta: Meta<typeof ButtonInline> = {
  title: 'Base/ButtonInline',
  component: ButtonInline,
  args: { children: 'Click me' },
};

export default meta;
type Story = StoryObj<typeof ButtonInline>;

export const Basic: Story = { args: {} };

export const Primary: Story = { args: { variant: 'primary' } };

export const PrimaryDisabled: Story = { args: { variant: 'primary', disabled: true } };

export const VeryLongText: Story = {
  args: { children: 'This is a button with a very very very very very very very very long text' },
};
