import type { Meta, StoryObj } from '@storybook/react-vite';
import { OopsKaomoji } from '@boluo/ui/OopsKaomoji';

const meta: Meta<typeof OopsKaomoji> = {
  title: 'Feedback/OopsKaomoji',
  component: OopsKaomoji,
};

export default meta;
type Story = StoryObj<typeof OopsKaomoji>;

export const Basic: Story = { args: {} };
