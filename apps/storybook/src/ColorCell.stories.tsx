import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorCell, type ColorCellProps } from '@boluo/ui/ColorCell';
import { useState } from 'react';

const meta: Meta<typeof ColorCell> = {
  title: 'Base/ColorCell',
  component: ColorCell,
  args: {
    color: '#3B82F6',
    selected: false,
  },
};

export default meta;
type Story = StoryObj<typeof ColorCell>;

const SelectableColorCell = (args: ColorCellProps) => {
  const [selected, setSelected] = useState(args.selected ?? false);
  return (
    <ColorCell
      {...args}
      selected={selected}
      onClick={() => {
        setSelected((prev) => !prev);
      }}
    />
  );
};

export const Basic: Story = {
  render: (args) => <SelectableColorCell {...args} />,
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
  render: (args) => <SelectableColorCell {...args} />,
};
