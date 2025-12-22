import type { Meta, StoryObj } from '@storybook/react-vite';
import { MessageBox } from '@boluo/ui/chat/MessageBox';
import { MessageHandleBox } from '@boluo/ui/chat/MessageHandleBox';
import { MessageTimeDisplay } from '@boluo/ui/chat/MessageTimeDisplay';
import { MessageContentBox } from '@boluo/ui/chat/MessageContentBox';
import { MessageNamePlate } from '@boluo/ui/chat/MessageNamePlate';
import { MessageToolbarBox } from '@boluo/ui/chat/MessageToolbarBox';
import { NameBox } from '@boluo/ui/chat/NameBox';
import type { ReactNode } from 'react';
import MoveVertical from '@boluo/icons/MoveVertical';
import PersonRunning from '@boluo/icons/PersonRunning';
import TowerBroadcast from '@boluo/icons/TowerBroadcast';
import { MessageToolbarButton } from '@boluo/ui/chat/MessageToolbarButton';

const meta: Meta<typeof MessageBox> = {
  title: 'Chat/MessageBox',
  component: MessageBox,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="bg-pane-bg @container h-screen py-8">
        <Story />
      </div>
    ),
  ],
  args: {
    pos: 128,
    timestamp: <MessageTimeDisplay createdAt={new Date('2024-07-08T10:32:00Z')} />,
  },
};

export default meta;
type Story = StoryObj<typeof MessageBox>;

interface DemoChildrenOptions {
  continued?: boolean;
  body?: ReactNode;
}

const getChildren = ({ continued = false, body }: DemoChildrenOptions = {}) => (
  <>
    <MessageHandleBox>
      <MoveVertical className="inline text-xs" />
    </MessageHandleBox>
    <MessageNamePlate continued={continued}>
      <NameBox color="#3b82f6">ほむら</NameBox>
    </MessageNamePlate>
    <MessageContentBox>
      {body ?? (
        <span>
          希望よりも熱く、
          <br />
          絶望よりも深いもの——愛よ！
        </span>
      )}
    </MessageContentBox>
  </>
);

export const Default: Story = {
  args: {
    children: getChildren(),
  },
};

export const WithToolbar: Story = {
  args: {
    children: getChildren(),
    toolbar: (
      <MessageToolbarBox>
        <MessageToolbarButton>
          <PersonRunning />
        </MessageToolbarButton>
        <MessageToolbarButton>
          <TowerBroadcast />
        </MessageToolbarButton>
      </MessageToolbarBox>
    ),
  },
};

export const InGameMessageInGameChannel: Story = {
  args: {
    inGame: true,
    isInGameChannel: true,
    children: getChildren(),
  },
};

export const OutOfGameMessageInGameChannel: Story = {
  args: {
    inGame: false,
    isInGameChannel: true,
    children: getChildren(),
  },
};

export const Continued: Story = {
  args: {
    continued: true,
    children: getChildren({
      continued: true,
    }),
  },
};

export const Lifting: Story = {
  args: {
    lifting: true,
    children: getChildren(),
  },
};

export const Highlighted: Story = {
  args: {
    highlighted: true,
    children: getChildren(),
  },
};
