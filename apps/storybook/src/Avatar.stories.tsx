import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from '@boluo/ui/users/Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Users/Avatar',
  component: Avatar,
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  args: {
    id: 'user-123',
    name: 'John Doe',
    avatarId: null,
  },
};

export const WithAvatarImage: Story = {
  args: {
    id: 'smol-latern',
    name: '小灯',
    avatarId: '6e8bcc86-6521-11f0-8003-4a6d51bbb76e',
    mediaUrl: 'https://media.boluochat.com',
  },
};

export const CustomSize: Story = {
  args: {
    id: 'user-789',
    name: 'Bob Johnson',
    avatarId: null,
    size: '64px',
  },
};

export const Clickable: Story = {
  args: {
    id: 'user-clickable',
    name: 'David Lee',
    avatarId: null,
    onClick: () => alert('Avatar clicked!'),
  },
};

export const WithCustomClass: Story = {
  args: {
    id: 'user-custom',
    name: 'Emma Davis',
    avatarId: null,
    className: 'rounded-full border-2 border-blue-500',
    size: '64px',
  },
};
