import type { Meta, StoryObj } from '@storybook/react-vite';

import { Select } from '@boluo/ui/Select';

const meta: Meta<typeof Select> = {
  title: 'Base/Select',
  component: Select,
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Basic: Story = {
  args: {
    children: (
      <>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
        <option value="3">Option 3</option>
      </>
    ),
  },
};
