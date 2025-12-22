import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@boluo/ui/Badge';
import Gamemaster from '@boluo/icons/Gamemaster';

const meta: Meta<typeof Badge> = {
  title: 'Base/Badge',
  component: Badge,
};

const dummyOnClick = () => {
  // do nothing
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Basic: Story = { args: { children: 'New' } };

export const Clickable: Story = {
  args: { children: 'Click Me', onClick: dummyOnClick },
};

export const WithIcon: Story = {
  args: {
    children: 'With Icon',
    icon: <Gamemaster className="h-4 w-4" />,
    onClick: dummyOnClick,
  },
};
