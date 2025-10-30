import type { Meta, StoryObj } from '@storybook/react-vite';
import { EntityUnknown } from '@boluo/ui/entities/EntityUnknown';

const meta: Meta<typeof EntityUnknown> = {
  title: 'Entities/Unknown',
  component: EntityUnknown,
};

export default meta;
type Story = StoryObj<typeof EntityUnknown>;

export const Basic: Story = {};
