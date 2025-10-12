import type { Meta, StoryObj } from '@storybook/react-vite';

import { FloatingBox } from '@boluo/ui/FloatingBox';

const meta: Meta<typeof FloatingBox> = {
  title: 'Base/FloatingBox',
  component: FloatingBox,
};

export default meta;
type Story = StoryObj<typeof FloatingBox>;

export const Basic: Story = { args: { children: 'This is a floating box' } };
