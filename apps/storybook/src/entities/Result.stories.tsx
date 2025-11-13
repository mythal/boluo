import type { Meta, StoryObj } from '@storybook/react-vite';
import { Result } from '@boluo/ui/entities/Result';

const meta: Meta<typeof Result> = {
  title: 'Entities/Result',
  component: Result,
  args: {
    children: '42',
  },
};

export default meta;
type Story = StoryObj<typeof Result>;

export const Default: Story = {};

export const Final: Story = {
  args: { final: true },
};

export const WithoutEqual: Story = {
  args: { noEqual: true },
};
