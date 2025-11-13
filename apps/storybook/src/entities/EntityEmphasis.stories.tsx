import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EntityOf } from '@boluo/api';
import { EntityEmphasis } from '@boluo/ui/entities/EntityEmphasis';

const emphasisText = 'emphasized phrase';
const source = `This sentence includes an ${emphasisText} for testing.`;
const start = source.indexOf(emphasisText);

const entity = {
  type: 'Emphasis',
  start,
  len: emphasisText.length,
  child: { type: 'Text', start, len: emphasisText.length },
} satisfies EntityOf<'Emphasis'>;

const meta: Meta<typeof EntityEmphasis> = {
  title: 'Entities/Emphasis',
  component: EntityEmphasis,
  args: {
    source,
    entity,
  },
};

export default meta;
type Story = StoryObj<typeof EntityEmphasis>;

export const Basic: Story = {};
