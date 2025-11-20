import type { Meta, StoryObj } from '@storybook/react-vite';
import { PreviewHandlePlaceHolder } from '@boluo/ui/PreviewHandlePlaceHolder';

const meta: Meta<typeof PreviewHandlePlaceHolder> = {
  title: 'Chat/PreviewHandlePlaceHolder',
  component: PreviewHandlePlaceHolder,
  args: {
    editMode: true,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5rem minmax(0, 1fr)',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '1rem',
          background: 'var(--color-message-out-of-game-bg, #10151f)',
          color: 'var(--color-text-primary, #f5f5f5)',
        }}
      >
        <Story />
        <div
          style={{
            height: '48px',
            borderRadius: '4px',
            background: 'var(--color-surface-default, rgba(255, 255, 255, 0.1))',
          }}
        />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PreviewHandlePlaceHolder>;

export const EditMode: Story = {};

export const ViewMode: Story = {
  args: {
    editMode: false,
  },
};
