import type { Meta, StoryObj } from '@storybook/react-vite';
import { BroadcastTurnedOff } from '@boluo/ui/chat/BroadcastTurnedOff';

const meta: Meta<typeof BroadcastTurnedOff> = {
  title: 'Chat/BroadcastTurnedOff',
  component: BroadcastTurnedOff,
};

export default meta;
type Story = StoryObj<typeof BroadcastTurnedOff>;

export const Basic: Story = {
  args: {
    count: 0,
  },
};
