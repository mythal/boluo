import type { Meta, StoryObj } from '@storybook/react-vite';
import { NameBox } from '@boluo/ui/chat/NameBox';
import Gamemaster from '@boluo/icons/Gamemaster';
import ChevronDown from '@boluo/icons/ChevronDown';
import Icon from '@boluo/ui/Icon';

const meta: Meta<typeof NameBox> = {
  title: 'Chat/NameBox',
  component: NameBox,
  parameters: {
    layout: 'centered',
  },
  args: {
    color: '#3b82f6',
    children: 'Iroha',
  },
};

export default meta;
type Story = StoryObj<typeof NameBox>;

const gmIcon = <Icon icon={Gamemaster} className="inline-block h-[1em] w-[1em]" />;
const chevronIcon = (
  <Icon icon={ChevronDown} className="text-text-muted inline-block h-[1em] w-[1em]" />
);

export const Basic: Story = {};

export const WithIcon: Story = {
  args: {
    icon: gmIcon,
    color: '#f97316',
  },
};

export const Interactive: Story = {
  args: {
    interactive: true,
    icon: chevronIcon,
  },
};

export const Pressed: Story = {
  args: {
    interactive: true,
    pressed: true,
    icon: chevronIcon,
    children: 'Editing Name',
  },
};
