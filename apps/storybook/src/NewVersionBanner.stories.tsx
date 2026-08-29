import { NewVersionBanner } from '@boluo/ui/NewVersionBanner';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof NewVersionBanner> = {
  title: 'Feedback/NewVersionBanner',
  component: NewVersionBanner,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onDismiss: () => {
      console.log('Update banner dismissed');
    },
    onRefresh: () => {
      console.log('Page refresh requested');
    },
  },
};

export default meta;
type Story = StoryObj<typeof NewVersionBanner>;

export const Default: Story = {};
