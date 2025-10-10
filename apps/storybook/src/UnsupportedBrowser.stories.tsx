import type { Meta, StoryObj } from '@storybook/react-vite';
import { UnsupportedBrowser } from '@boluo/ui/UnsupportedBrowser';
import type { AppSettings } from '@boluo/api';
import { SWRConfig, unstable_serialize } from 'swr';

const settingsKey = unstable_serialize(['/info/settings' as const, null]);

const defaultSettings: AppSettings = {
  mediaUrl: 'https://media.boluo.chat',
  appUrl: 'https://app.boluo.chat',
  siteUrl: 'https://boluo.chat',
  sentryDsn: null,
};

const meta: Meta<typeof UnsupportedBrowser> = {
  component: UnsupportedBrowser,
  decorators: [
    (Story) => (
      <SWRConfig value={{ fallback: { [settingsKey]: defaultSettings } }}>
        <Story />
      </SWRConfig>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof UnsupportedBrowser>;

export const Desktop: Story = {
  args: { isIos: false },
};

export const Ios: Story = {
  args: { isIos: true },
};
