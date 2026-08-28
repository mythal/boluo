import type { Meta, StoryObj } from '@storybook/react-vite';
import { MessageMediaDisplay } from '@boluo/ui/chat/MessageMediaDisplay';

const meta: Meta<typeof MessageMediaDisplay> = {
  title: 'Chat/MessageMediaDisplay',
  component: MessageMediaDisplay,
  decorators: [
    (Story) => (
      <div className="bg-pane-bg w-[28rem] max-w-full p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MessageMediaDisplay>;

export const Image: Story = {
  args: {
    type: 'IMAGE',
    src: '/boluo-pixel.png',
    alt: 'Boluo pixel art',
    loadState: 'LOADED',
    onPreview: () => undefined,
  },
};

export const ImageLoading: Story = {
  args: {
    type: 'IMAGE',
    src: '/boluo-pixel.png',
    alt: 'Boluo pixel art',
    loadState: 'LOADING',
    onPreview: () => undefined,
  },
};

export const LoadFailed: Story = {
  args: {
    type: 'ERROR',
    onRetry: () => undefined,
  },
};

export const Pdf: Story = {
  args: {
    type: 'ATTACHMENT',
    name: 'Masks of Nyarlathotep - Keeper Rulebook.pdf',
    mimeType: 'application/pdf',
    size: 8_482_193,
    downloadHref: '#download',
    onPreview: (event) => event.preventDefault(),
  },
};

export const GenericAttachment: Story = {
  args: {
    type: 'ATTACHMENT',
    name: 'session-recording.ogg',
    mimeType: 'audio/ogg',
    size: 1_245_930,
    downloadHref: '#download',
  },
};

export const LongFilenameInNarrowContainer: Story = {
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
  args: {
    type: 'ATTACHMENT',
    name: '这是一个非常长的调查资料文件名用于验证窄消息布局.pdf',
    mimeType: 'application/pdf',
    size: 4096,
    downloadHref: '#download',
    onPreview: (event) => event.preventDefault(),
  },
};
