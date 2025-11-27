import type { Meta, StoryObj } from '@storybook/react-vite';
import { PaneBanner } from '@boluo/ui/PaneBanner';

const meta: Meta<typeof PaneBanner> = {
  title: 'Pane/PaneBanner',
  component: PaneBanner,
  args: {
    onDismiss: () => {
      console.log('Pane banner dismissed');
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof PaneBanner>;

export const Info: Story = {
  args: {
    banner: {
      level: 'INFO',
      content: 'All changes are saved automatically.',
    },
  },
};

export const Warning: Story = {
  args: {
    banner: {
      level: 'WARNING',
      content: 'Connection is unstable. Your updates may not be synced.',
    },
  },
};

export const Error: Story = {
  args: {
    banner: {
      level: 'ERROR',
      content: 'Failed to save changes. Please try again in a moment.',
    },
  },
};
