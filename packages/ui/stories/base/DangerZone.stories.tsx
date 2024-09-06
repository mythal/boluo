import type { Meta, StoryObj } from '@storybook/react';
import { DangerZone } from '../../DangerZone';
import { Button } from '../../Button';

const meta: Meta<typeof DangerZone> = {
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
