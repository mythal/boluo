import type { Meta, StoryObj } from '@storybook/react-vite';
import { IsActionIndicator } from '@boluo/ui/chat/IsActionIndicator';

const meta: Meta<typeof IsActionIndicator> = {
  title: 'Chat/IsActionIndicator',
  component: IsActionIndicator,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof IsActionIndicator>;

export const Basic: Story = {};
