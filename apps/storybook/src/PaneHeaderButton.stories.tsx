import type { Meta, StoryObj } from '@storybook/react-vite';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import Settings from '@boluo/icons/Settings';
import SplitHorizontal from '@boluo/icons/SplitHorizontal';
import { Spinner } from '@boluo/ui/Spinner';

const meta: Meta<typeof PaneHeaderButton> = {
  title: 'Pane/PaneHeaderButton',
  component: PaneHeaderButton,
  args: {
    children: 'Action',
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof PaneHeaderButton>;

export const Basic: Story = {
  args: {
    icon: <Settings />,
  },
};

export const Active: Story = {
  args: {
    icon: <SplitHorizontal />,
    active: true,
    children: 'Active state',
  },
};

export const Loading: Story = {
  args: {
    icon: <Spinner />,
    isLoading: true,
    children: 'Waiting',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    children: 'Small',
  },
};
