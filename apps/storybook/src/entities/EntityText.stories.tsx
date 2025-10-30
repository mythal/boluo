import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EntityOf } from '@boluo/api';
import { EntityText } from '@boluo/ui/entities/EntityText';

const snippet =
  '我！讨厌岛村在我不知道的地方露出笑容！也讨厌你跟其他人牵手！我希望你只牵我的手！只待在我身旁！祭典也是，我也很想去啊！';
const source = `.as 安达; ${snippet}`;
const start = source.indexOf(snippet);

const entity = {
  type: 'Text',
  start,
  len: snippet.length,
} satisfies EntityOf<'Text'>;

const meta: Meta<typeof EntityText> = {
  title: 'Entities/Text',
  component: EntityText,
  args: {
    source,
    entity,
  },
};

export default meta;
type Story = StoryObj<typeof EntityText>;

export const Basic: Story = {};
