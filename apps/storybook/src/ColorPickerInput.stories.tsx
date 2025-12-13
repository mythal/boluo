import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorPickerInput, type ColorPickerInputProps } from '@boluo/ui/ColorPickerInput';
import { useState } from 'react';

const meta: Meta<typeof ColorPickerInput> = {
  title: 'Base/ColorPickerInput',
  component: ColorPickerInput,
};

export default meta;
type Story = StoryObj<typeof ColorPickerInput>;

const ControlledColorPickerInput = (args: ColorPickerInputProps) => {
  const [value, setValue] = useState('#3B82F6');
  return (
    <ColorPickerInput
      {...args}
      colorValue={value}
      textValue={value}
      onChange={(next) => setValue(next)}
    />
  );
};

export const Basic: Story = {
  render: (args) => <ControlledColorPickerInput {...args} />,
};
