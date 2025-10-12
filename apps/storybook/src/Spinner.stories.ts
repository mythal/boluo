import type { Meta, StoryObj } from '@storybook/react-vite';

import { Spinner } from '@boluo/ui/Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Feedback/Spinner',
  component: Spinner,
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Basic: Story = { args: {} };
