import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@boluo/ui/Button';

const meta: Meta<typeof Button> = { component: Button, args: { children: 'Click me' } };

export default meta;
type Story = StoryObj<typeof Button>;

export const Basic: Story = { args: { disabled: false } };

export const Small: Story = { args: { small: true } };

export const Detail: Story = { args: { variant: 'detail' } };

export const DetailSmall: Story = {
  args: { children: 'Click me', variant: 'detail', small: true },
};
