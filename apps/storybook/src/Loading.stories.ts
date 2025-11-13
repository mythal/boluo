import type { Meta, StoryObj } from '@storybook/react-vite';
import { Loading } from '@boluo/ui/Loading';

const meta: Meta<typeof Loading> = {
  title: 'Feedback/Loading',
  component: Loading,
};

export default meta;
type Story = StoryObj<typeof Loading>;

export const Inline: Story = { args: { type: 'inline' } };

export const Block: Story = { args: { type: 'block' } };
