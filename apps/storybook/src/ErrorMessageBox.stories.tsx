import type { Meta, StoryObj } from '@storybook/react';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';

const meta: Meta<typeof ErrorMessageBox> = { component: ErrorMessageBox };

export default meta;
type Story = StoryObj<typeof ErrorMessageBox>;

export const Basic: Story = { args: { children: 'This is an error message' } };
