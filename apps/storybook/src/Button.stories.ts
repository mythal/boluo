import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '@boluo/ui/Button';

const meta: Meta<typeof Button> = {
  title: 'Base/Button',
  component: Button,
  args: { children: 'Click me' },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Basic: Story = { args: { disabled: false } };

export const Active: Story = { args: { active: true } };

export const Disabled: Story = { args: { disabled: true } };

export const Primary: Story = { args: { variant: 'primary' } };

export const PrimaryActive: Story = { args: { variant: 'primary', active: true } };

export const PrimaryDisabled: Story = { args: { variant: 'primary', disabled: true } };

export const Danger: Story = { args: { variant: 'danger' } };

export const DangerDisabled: Story = { args: { variant: 'danger', disabled: true } };

export const Small: Story = { args: { small: true } };

export const Detail: Story = { args: { variant: 'detail' } };

export const DetailActive: Story = {
  args: { children: 'Active', variant: 'detail', active: true },
};

export const DetailSmall: Story = {
  args: { children: 'Click me', variant: 'detail', small: true },
};
