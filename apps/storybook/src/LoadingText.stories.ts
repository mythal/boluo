import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadingText } from '@boluo/ui/LoadingText';

const meta: Meta<typeof LoadingText> = {
  title: 'Feedback/LoadingText',
  component: LoadingText,
};

export default meta;
type Story = StoryObj<typeof LoadingText>;

export const Basic: Story = { args: {} };
