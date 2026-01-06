import type { Meta, StoryObj } from '@storybook/react-vite';
import { type CSSProperties, useState } from 'react';
import { SidebarButton } from '@boluo/ui/chat/SidebarButton';
import { IsTouchContext } from '@boluo/ui/hooks/useIsTouch';

const meta: Meta<typeof SidebarButton> = {
  title: 'Sidebar/SidebarButton',
  component: SidebarButton,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    isSidebarExpanded: { table: { disable: true } },
    setSidebarExpanded: { table: { disable: true } },
  },
};

export default meta;
type Story = StoryObj<typeof SidebarButton>;

type CanvasStyle = CSSProperties & {
  '--spacing-sidebar'?: string;
};

const canvasStyle: CanvasStyle = {
  minHeight: '100vh',
  width: '100%',
  '--spacing-sidebar': '15rem',
};

const SidebarButtonCanvas = ({
  initialExpanded = false,
  error,
}: {
  initialExpanded?: boolean;
  error?: { message: string; onRetry?: () => void };
}) => {
  const [isExpanded, setExpanded] = useState(initialExpanded);

  return (
    <div style={canvasStyle}>
      <SidebarButton
        isSidebarExpanded={isExpanded}
        setSidebarExpanded={setExpanded}
        error={error}
        disconnected={error != null}
      />
    </div>
  );
};

export const Collapsed: Story = {
  args: {
    isSidebarExpanded: false,
  },
  render: (args) => <SidebarButtonCanvas initialExpanded={args.isSidebarExpanded} />,
};

export const Expanded: Story = {
  args: {
    isSidebarExpanded: true,
  },
  render: (args) => <SidebarButtonCanvas initialExpanded={args.isSidebarExpanded} />,
};

export const Touch: Story = {
  args: {
    isSidebarExpanded: false,
  },
  render: (args) => (
    <IsTouchContext.Provider value={true}>
      <SidebarButtonCanvas initialExpanded={args.isSidebarExpanded} />
    </IsTouchContext.Provider>
  ),
};

export const Error: Story = {
  args: {
    isSidebarExpanded: false,
    disconnected: true,
  },
  render: (args) => (
    <SidebarButtonCanvas
      initialExpanded={args.isSidebarExpanded}
      error={{ message: 'Connection error.', onRetry: () => console.info('retry') }}
    />
  ),
};
