import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EntityOf } from '@boluo/api';
import { EntityStrongEmphasis } from '@boluo/ui/entities/EntityStrongEmphasis';

const highlighted = 'critical success';
const source = `Rolling the dice resulted in a ${highlighted}!`;
const start = source.indexOf(highlighted);

const entity = {
  type: 'StrongEmphasis',
  start,
  len: highlighted.length,
  child: { type: 'Text', start, len: highlighted.length },
} satisfies EntityOf<'StrongEmphasis'>;

const meta: Meta<typeof EntityStrongEmphasis> = {
  title: 'Entities/Strong Emphasis',
  component: EntityStrongEmphasis,
  args: {
    source,
    entity,
  },
};

export default meta;
type Story = StoryObj<typeof EntityStrongEmphasis>;

export const Basic: Story = {};
