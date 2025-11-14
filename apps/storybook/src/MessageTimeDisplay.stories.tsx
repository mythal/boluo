import type { Meta, StoryObj } from '@storybook/react-vite';
import { MessageTimeDisplay } from '@boluo/ui/chat/MessageTimeDisplay';

const meta: Meta<typeof MessageTimeDisplay> = {
  title: 'Chat/MessageTimeDisplay',
  component: MessageTimeDisplay,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MessageTimeDisplay>;

const createDate = () => new Date('2024-07-08T10:32:00Z');

export const Default: Story = {
  args: {
    createdAt: createDate(),
  },
};

export const Edited: Story = {
  args: {
    createdAt: createDate(),
    edited: true,
  },
};

export const Failed: Story = {
  args: {
    createdAt: createDate(),
    failed: true,
  },
};
