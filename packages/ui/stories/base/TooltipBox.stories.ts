import type { Meta, StoryObj } from '@storybook/react';

import { TooltipBox } from '../../TooltipBox';

const meta: Meta<typeof TooltipBox> = {
  component: TooltipBox,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof TooltipBox>;

export const Basic: Story = {
  args: {
    show: true,
    defaultStyle: true,
    children: 'This is a tooltip',
  },
};
