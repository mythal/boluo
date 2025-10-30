import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EntityOf } from '@boluo/api';
import { EntityStrong } from '@boluo/ui/entities/EntityStrong';

const boldText = 'important reminder';
const source = `Here is an ${boldText} for the next session.`;
const start = source.indexOf(boldText);

const entity = {
  type: 'Strong',
  start,
  len: boldText.length,
  child: { type: 'Text', start, len: boldText.length },
} satisfies EntityOf<'Strong'>;

const meta: Meta<typeof EntityStrong> = {
  title: 'Entities/Strong',
  component: EntityStrong,
  args: {
    source,
    entity,
  },
};

export default meta;
type Story = StoryObj<typeof EntityStrong>;

export const Basic: Story = {};
