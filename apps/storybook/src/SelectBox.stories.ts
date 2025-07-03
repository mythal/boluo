import type { Meta, StoryObj } from '@storybook/react-vite';
import { SelectBox } from '@boluo/ui/SelectBox';
import { fn } from 'storybook/test';
const meta: Meta<typeof SelectBox> = {
  component: SelectBox,
  args: { title: 'A SelectBox', onSelected: fn(), selected: false },
};

export default meta;
type Story = StoryObj<typeof SelectBox>;

export const Basic: Story = { args: {} };

export const Selected: Story = { args: { selected: true } };

export const WithDescription: Story = { args: { description: 'A description' } };

export const SelectedWithDescription: Story = {
  args: { selected: true, description: 'A description' },
};
