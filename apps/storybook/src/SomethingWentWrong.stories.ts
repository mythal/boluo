import type { Meta, StoryObj } from '@storybook/react-vite';
import { SomethingWentWrong } from '@boluo/ui/SomethingWentWrong';

const meta: Meta<typeof SomethingWentWrong> = { component: SomethingWentWrong };

export default meta;
type Story = StoryObj<typeof SomethingWentWrong>;

export const Basic: Story = { args: {} };
