import type { ComponentSnapshot } from '@boluo/api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EntityComponentReport } from '@boluo/ui/entities/EntityComponentReport';
import { MessageBox } from '@boluo/ui/chat/MessageBox';
import { PreviewBox } from '@boluo/ui/chat/PreviewBox';

const snapshotItems: ComponentSnapshot[] = [
  {
    component: {
      entryId: 'hp',
      scopeId: 'scope',
      key: 'hp',
      componentType: 'core/counter',
    },
    displayName: '血量',
    payload: { payloadType: 'JSON', schemaVersion: 1, data: { value: 9, max: 20 } },
  },
  {
    component: {
      entryId: 'strength',
      scopeId: 'scope',
      key: '力量',
      componentType: 'core/counter',
    },
    displayName: '力量',
    payload: { payloadType: 'JSON', schemaVersion: 1, data: { value: 60 } },
  },
  {
    component: {
      entryId: 'mp',
      scopeId: 'scope',
      key: 'mp',
      componentType: 'core/counter',
    },
    displayName: '魔法值',
    payload: { payloadType: 'JSON', schemaVersion: 1, data: { value: 0, max: 10 } },
  },
];

const meta = {
  title: 'Entities/Component Report',
  component: EntityComponentReport,
  tags: ['autodocs'],
  args: {
    source: '.st show',
    scopeNames: { scope: '暁美ほむら' },
    entity: {
      start: 0,
      len: 8,
      report: {
        type: 'Snapshot',
        items: snapshotItems,
      },
    },
  },
} satisfies Meta<typeof EntityComponentReport>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Snapshot: Story = {};
export const MessageBackgrounds: Story = {
  render: (args) => (
    <div className="w-[min(32rem,calc(100vw-2rem))] space-y-4">
      {[true, false].map((inGame) => (
        <div key={String(inGame)}>
          <div className="text-text-muted mb-1 text-sm">{inGame ? 'In game' : 'Out of game'}</div>
          <MessageBox inGame={inGame} isInGameChannel>
            <div className="col-start-2">
              <EntityComponentReport {...args} />
            </div>
          </MessageBox>
          <PreviewBox
            id={`counters-${inGame}`}
            pos={1}
            inGame={inGame}
            isInGameChannel
            isLast
            isSelf
          >
            <div className="col-start-2">
              <EntityComponentReport {...args} preview />
            </div>
          </PreviewBox>
        </div>
      ))}
    </div>
  ),
};
export const Empty: Story = {
  args: { entity: { start: 0, len: 8, report: { type: 'Snapshot', items: [] } } },
};
export const Changed: Story = {
  args: {
    entity: {
      start: 0,
      len: 8,
      report: {
        type: 'Change',
        items: [{ entryId: 'hp', scopeId: 'scope', key: 'hp', componentType: 'core/counter' }],
      },
    },
    changes: [
      {
        component: { entryId: 'hp', scopeId: 'scope', key: 'hp', componentType: 'core/counter' },
        displayName: '血量',
        before: { payloadType: 'JSON', schemaVersion: 1, data: { value: 12, max: 20 } },
        after: { payloadType: 'JSON', schemaVersion: 1, data: { value: 9, max: 20 } },
      },
    ],
  },
};
export const ValueAndMaxChanged: Story = {
  args: {
    ...Changed.args,
    changes: [
      {
        component: { entryId: 'hp', scopeId: 'scope', key: 'hp', componentType: 'core/counter' },
        displayName: '血量',
        before: { payloadType: 'JSON', schemaVersion: 1, data: { value: 12, max: 14 } },
        after: { payloadType: 'JSON', schemaVersion: 1, data: { value: 9, max: 20 } },
      },
    ],
  },
};
export const Preview: Story = {
  args: {
    entity: {
      start: 0,
      len: 8,
      report: {
        type: 'ChangePreview',
        items: [
          {
            component: {
              entryId: 'hp',
              scopeId: 'scope',
              key: 'hp',
              componentType: 'core/counter',
            },
            displayName: '血量',
            before: { payloadType: 'JSON', schemaVersion: 1, data: { value: 12, max: 20 } },
            after: { payloadType: 'JSON', schemaVersion: 1, data: { value: 9, max: 20 } },
          },
        ],
      },
    },
  },
};
export const Created: Story = {
  args: {
    ...Changed.args,
    changes: [
      {
        component: { entryId: 'hp', scopeId: 'scope', key: 'hp', componentType: 'core/counter' },
        displayName: '血量',
        before: null,
        after: { payloadType: 'JSON', schemaVersion: 1, data: { value: 12, max: 20 } },
      },
    ],
  },
};
export const Deleted: Story = {
  args: {
    ...Changed.args,
    changes: [
      {
        component: { entryId: 'hp', scopeId: 'scope', key: 'hp', componentType: 'core/counter' },
        displayName: '血量',
        before: { payloadType: 'JSON', schemaVersion: 1, data: { value: 12, max: 20 } },
        after: null,
      },
    ],
  },
};
export const Unconfirmed: Story = { args: { ...Changed.args, changes: undefined } };
export const Loading: Story = { args: { ...Unconfirmed.args, loadState: 'loading' } };
export const LoadFailed: Story = { args: { ...Unconfirmed.args, loadState: 'error' } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div className="w-40">
        <Story />
      </div>
    ),
  ],
};

export const UnsupportedComponent: Story = {
  args: {
    entity: {
      start: 0,
      len: 0,
      report: {
        type: 'Snapshot',
        items: [
          {
            component: {
              scopeId: 'scope',
              entryId: 'text',
              key: 'description',
              componentType: 'example/text',
            },
            displayName: 'Description',
            payload: { payloadType: 'JSON', schemaVersion: 1, data: { text: 'Hello' } },
          },
          {
            component: {
              scopeId: 'scope',
              entryId: 'notes',
              key: 'notes',
              componentType: 'example/text',
            },
            displayName: '',
            payload: { payloadType: 'JSON', schemaVersion: 1, data: { text: 'Notes' } },
          },
        ],
      },
    },
  },
};

export const UnknownScope: Story = { args: { scopeNames: {} } };

export const MultipleScopes: Story = {
  args: {
    scopeNames: { scope: '暁美ほむら', 'another-scope': '鹿目まどか' },
    entity: {
      ...meta.args.entity,
      report: {
        type: 'Snapshot',
        items: [
          ...snapshotItems,
          {
            component: {
              entryId: 'another-hp',
              scopeId: 'another-scope',
              key: 'hp',
              componentType: 'core/counter',
            },
            displayName: '血量',
            payload: { payloadType: 'JSON', schemaVersion: 1, data: { value: 15 } },
          },
        ],
      },
    },
  },
};
