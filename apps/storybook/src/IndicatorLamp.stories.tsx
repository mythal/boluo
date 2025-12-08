import type { Meta, StoryObj } from '@storybook/react-vite';
import { LampSwitch } from '@boluo/ui/LampSwitch';

const meta: Meta<typeof LampSwitch> = {
  title: 'Base/LampSwitch',
  component: LampSwitch,
  args: {
    isOn: false,
  },
  decorators: [
    (Story) => (
      <div className="border-border-default bg-surface-muted relative flex h-12 w-20 items-center justify-center rounded border">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof LampSwitch>;

export const Off: Story = {};

export const On: Story = { args: { isOn: true } };
