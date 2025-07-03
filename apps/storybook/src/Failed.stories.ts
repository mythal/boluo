import type { Meta, StoryObj } from '@storybook/react-vite';
import { Failed } from '@boluo/ui/Failed';

const meta: Meta<typeof Failed> = { component: Failed };

export default meta;
type Story = StoryObj<typeof Failed>;

const code = 'NOT_FOUND';
const eventId = '100e4721bebf4809b1bd0be9200d1391';

export const Full: Story = {
  args: { title: 'Oops!', message: 'Something went wrong.', code, eventId },
};

export const TitleAndMessage: Story = {
  args: { title: "We're sorry", message: 'Homura captured Madoka.' },
};

export const Empty: Story = { args: {} };

export const CodeOnly: Story = { args: { code } };

export const EventIdOnly: Story = { args: { eventId } };
