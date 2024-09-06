import type { Meta, StoryObj } from '@storybook/react';
import { OopsKaomoji } from '../../OopsKaomoji';

const meta: Meta<typeof OopsKaomoji> = {
  component: OopsKaomoji,
};

export default meta;
type Story = StoryObj<typeof OopsKaomoji>;

export const Basic: Story = {
  args: {},
};
