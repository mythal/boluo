import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadFailed } from '@boluo/ui/LoadFailed';

const meta: Meta<typeof LoadFailed> = { title: 'Feedback/LoadFailed', component: LoadFailed };

export default meta;
type Story = StoryObj<typeof LoadFailed>;

export const Default: Story = {
  args: {},
};
