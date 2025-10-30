import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EntityOf } from '@boluo/api';
import { EntityLink } from '@boluo/ui/entities/EntityLink';

const linkText = 'very horny link';
const source = `This is a ${linkText} XD`;
const start = source.indexOf(linkText);

const entity = {
  type: 'Link',
  start,
  len: linkText.length,
  child: { type: 'Text', start, len: linkText.length },
  href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'very horny link',
} satisfies EntityOf<'Link'>;

const meta: Meta<typeof EntityLink> = {
  title: 'Entities/Link',
  component: EntityLink,
  args: {
    source,
    entity,
  },
};

export default meta;
type Story = StoryObj<typeof EntityLink>;

export const Basic: Story = {};
