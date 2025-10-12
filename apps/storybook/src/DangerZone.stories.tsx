import type { Meta, StoryObj } from '@storybook/react-vite';
import { DangerZone } from '@boluo/ui/DangerZone';
import { Button } from '@boluo/ui/Button';

const meta: Meta<typeof DangerZone> = {
  title: 'Base/DangerZone',
  component: DangerZone,
};

export default meta;
type Story = StoryObj<typeof DangerZone>;

export const Basic: Story = {
  args: {
    prompt: 'Are you sure?',
    children: (
      <div className="flex h-20 w-40 items-center justify-center">
        <Button variant="danger">Delete</Button>
      </div>
    ),
  },
};
