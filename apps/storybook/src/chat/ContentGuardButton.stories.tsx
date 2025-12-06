import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ContentGuardButton } from '@boluo/ui/chat/ContentGuardButton';

const meta: Meta<typeof ContentGuardButton> = {
  title: 'Chat/ContentGuardButton',
  component: ContentGuardButton,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ContentGuardButton>;

const Canvas = () => {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="border-border-weak bg-surface-unit text-text-primary relative w-56 rounded-xl border p-5 shadow-xl">
      <p className={`leading-relaxed transition ${revealed ? '' : 'blur-sm select-none'}`}>
        This content stays blurred until you click Reveal. Use this pattern to hide whispers or
        spoilers until a player decides to uncover them.
      </p>
      {!revealed && <ContentGuardButton onReveal={() => setRevealed(true)} />}
    </div>
  );
};

export const Default: Story = {
  render: () => <Canvas />,
};
