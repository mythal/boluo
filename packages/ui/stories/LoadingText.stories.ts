import type { Meta, StoryObj } from '@storybook/react';
import { LoadingText } from '../LoadingText';

const meta: Meta<typeof LoadingText> = {
  component: LoadingText,
};

export default meta;
type Story = StoryObj<typeof LoadingText>;

export const Basic: Story = {
  args: {},
};
