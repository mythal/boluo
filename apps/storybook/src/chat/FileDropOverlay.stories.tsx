import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { FileDropOverlay } from '@boluo/ui/chat/FileDropOverlay';

const meta: Meta<typeof FileDropOverlay> = {
  title: 'Chat/FileDropOverlay',
  component: FileDropOverlay,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof FileDropOverlay>;

const Canvas = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.7),rgba(220,220,235,0.4)),linear-gradient(135deg,#111827,#0f172a)] text-white">
      {children}
    </div>
  );
};

export const Default: Story = {
  render: (args) => (
    <Canvas>
      <div className="">
        <FileDropOverlay {...args} />
      </div>
    </Canvas>
  ),
};
