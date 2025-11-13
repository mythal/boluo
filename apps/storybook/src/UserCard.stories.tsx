import type { Meta, StoryObj } from '@storybook/react-vite';
import { UserCard } from '@boluo/ui/users/UserCard';
import {
  baseUser,
  mediaUrl,
  userWithAvatar,
  userMinimal,
  userWithLongBio,
  userWithLongNames,
  userWithoutBio,
} from './examples';

const meta: Meta<typeof UserCard> = {
  title: 'Users/UserCard',
  component: UserCard,
};

export default meta;
type Story = StoryObj<typeof UserCard>;

export const Default: Story = {
  args: {
    user: baseUser,
  },
};

export const WithAvatar: Story = {
  args: {
    user: userWithAvatar,
    mediaUrl,
  },
};

export const WithLongBio: Story = {
  args: {
    user: userWithLongBio,
  },
};

export const WithoutBio: Story = {
  args: {
    user: userWithoutBio,
  },
};

export const WithLongNames: Story = {
  args: {
    user: userWithLongNames,
  },
};

export const MinimalUser: Story = {
  args: {
    user: userMinimal,
  },
};
