import type { Meta, StoryObj } from '@storybook/react-vite';
import { FailedBanner } from '@boluo/ui/chat/FailedBanner';
import AlertTriangle from '@boluo/icons/AlertTriangle';
import XCircle from '@boluo/icons/XCircle';

const meta: Meta<typeof FailedBanner> = {
  title: 'Feedback/FailedBanner',
  component: FailedBanner,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof FailedBanner>;

export const Basic: Story = {
  args: {
    children: 'Failed to load the message',
  },
};

export const WithError: Story = {
  args: {
    children: 'Failed to send message',
    error: new Error('Network connection failed'),
  },
};

export const WithCustomIcon: Story = {
  args: {
    children: 'Operation failed',
    icon: <AlertTriangle />,
    error: new Error('Something went wrong'),
  },
};

export const WithDismissHandler: Story = {
  args: {
    children: 'This is a dismissible banner',
    error: new Error('An error occurred'),
    onDismiss: () => {
      console.log('Banner dismissed');
    },
  },
};

export const LongErrorMessage: Story = {
  args: {
    children: 'A critical error has occurred while processing your request',
    error: new Error(
      'The server encountered an unexpected condition that prevented it from fulfilling the request. This could be due to a temporary issue with the service or a problem with your network connection.',
    ),
    icon: <XCircle />,
  },
};
