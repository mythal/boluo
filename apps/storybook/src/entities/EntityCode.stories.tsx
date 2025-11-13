import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EntityOf } from '@boluo/api';
import { EntityCode } from '@boluo/ui/entities/EntityCode';

const source = 'console.log("Storybook");';

const entity = {
  type: 'Code',
  start: 0,
  len: source.length,
  child: { type: 'Text', start: 0, len: source.length },
} satisfies EntityOf<'Code'>;

const meta: Meta<typeof EntityCode> = {
  title: 'Entities/Code',
  component: EntityCode,
  args: {
    source,
    entity,
  },
};

export default meta;
type Story = StoryObj<typeof EntityCode>;

export const Basic: Story = {};
