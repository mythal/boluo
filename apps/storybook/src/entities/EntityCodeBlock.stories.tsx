import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EntityOf } from '@boluo/api';
import { EntityCodeBlock } from '@boluo/ui/entities/EntityCodeBlock';

const source = `我们度过的每个平凡的日常，也许就是连续发生的奇迹。`;

const entity = {
  type: 'CodeBlock',
  start: 0,
  len: source.length,
  child: { type: 'Text', start: 0, len: source.length },
} satisfies EntityOf<'CodeBlock'>;

const meta: Meta<typeof EntityCodeBlock> = {
  title: 'Entities/CodeBlock',
  component: EntityCodeBlock,
  args: {
    source,
    entity,
  },
};

export default meta;
type Story = StoryObj<typeof EntityCodeBlock>;

export const Basic: Story = {};
