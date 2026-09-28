import assert from 'node:assert/strict';
import test from 'node:test';
import { Err } from '@boluo/utils/result';
import {
  emptyPaneLayout,
  paneLayoutFromPanesJson,
  paneLayoutFromWorkspace,
  paneWorkspaceFromLayout,
  validatePaneLayout,
} from './pane-layout';
import {
  decodePaneLayoutQuery,
  decodePaneTarget,
  encodePaneLayoutQuery,
  encodePaneTarget,
} from './pane-layout-url';
import type { PaneLayout } from './pane-layout.types';
import type { PaneTarget } from './pane-workspace.types';

const spaceId = '11111111-1111-4111-8111-111111111111';
const otherSpaceId = '22222222-2222-4222-8222-222222222222';
const channelId = '33333333-3333-4333-8333-333333333333';
const otherChannelId = '44444444-4444-4444-8444-444444444444';
const characterId = '55555555-5555-4555-8555-555555555555';
const userId = '66666666-6666-4666-8666-666666666666';

const defaultTile = (target: PaneTarget) => ({ target, weight: 1, collapsed: false });

const layout: PaneLayout = {
  columns: [
    {
      width: 1,
      collapsed: false,
      tiles: [defaultTile({ type: 'CHANNEL', channelId })],
    },
    {
      width: 1.5,
      collapsed: true,
      tiles: [
        defaultTile({ type: 'CHARACTER', spaceId, characterId }),
        {
          target: { type: 'PROFILE', userId },
          weight: 2,
          collapsed: true,
        },
      ],
    },
  ],
  transient: [
    {
      target: { type: 'CHANNEL_SETTINGS', channelId: otherChannelId },
      anchorIndex: 0,
    },
    {
      target: { type: 'HELP' },
      anchorIndex: null,
    },
  ],
};

test('all pane target types have stable compact encodings', () => {
  const cases: Array<[PaneTarget, string]> = [
    [{ type: 'SPACE', spaceId }, 'space'],
    [{ type: 'SPACE', spaceId: otherSpaceId }, `space.${otherSpaceId}`],
    [{ type: 'CHANNEL', channelId }, `channel.${channelId}`],
    [{ type: 'CHARACTER', spaceId, characterId }, `character.${characterId}`],
    [
      { type: 'CHARACTER', spaceId: otherSpaceId, characterId },
      `character.${otherSpaceId}.${characterId}`,
    ],
    [{ type: 'EMPTY' }, 'empty'],
    [{ type: 'SETTINGS' }, 'settings'],
    [{ type: 'HELP' }, 'help'],
    [{ type: 'WELCOME' }, 'welcome'],
    [{ type: 'SPACE_SETTINGS', spaceId }, 'space-settings'],
    [{ type: 'SPACE_GREETING', spaceId }, 'space-greeting'],
    [{ type: 'CREATE_CHANNEL', spaceId }, 'create-channel'],
    [{ type: 'CREATE_SPACE' }, 'create-space'],
    [{ type: 'LOGIN' }, 'login'],
    [{ type: 'SIGN_UP' }, 'sign-up'],
    [{ type: 'RESET_PASSWORD' }, 'reset-password'],
    [{ type: 'PROFILE', userId }, `profile.${userId}`],
    [{ type: 'SPACE_MEMBERS', spaceId }, 'space-members'],
    [{ type: 'CHANNEL_SETTINGS', channelId }, `channel-settings.${channelId}`],
    [{ type: 'CHANNEL_TOPIC', channelId }, `channel-topic.${channelId}`],
    [{ type: 'CHANNEL_EXPORT', channelId }, `channel-export.${channelId}`],
  ];

  for (const [target, encoded] of cases) {
    assert.equal(encodePaneTarget(target, 0, spaceId).unwrap(), encoded);
    assert.deepEqual(decodePaneTarget(encoded, 0, spaceId).unwrap(), target);
  }
});

test('compact layout encoding omits defaults and round-trips the complete layout', () => {
  const encoded = encodePaneLayoutQuery(layout, spaceId).unwrap();
  assert.equal(
    encoded,
    `layout=channel.${channelId}!w(1.5):character.${characterId}~profile.${userId}@w(2)&transient=channel-settings.${otherChannelId}@a0,help`,
  );
  assert.deepEqual(decodePaneLayoutQuery(`#route=${spaceId}&${encoded}`, spaceId).unwrap(), {
    layout,
    source: 'LAYOUT',
  });
  assert.equal(
    encodePaneLayoutQuery({
      columns: [
        {
          width: 1,
          collapsed: true,
          tiles: [{ target: { type: 'SETTINGS' }, weight: 1, collapsed: true }],
        },
      ],
      transient: [],
    }).unwrap(),
    'layout=w(1):settings@w(1)',
  );
});

test('workspace conversion assigns runtime identities without putting them in the layout', () => {
  const workspace = paneWorkspaceFromLayout(layout, {
    paneId: (index) => `pane-${index}`,
    columnId: (index) => `column-${index}`,
  }).unwrap();

  assert.deepEqual(Object.keys(workspace.panes), [
    'pane-0',
    'pane-1',
    'pane-2',
    'pane-3',
    'pane-4',
  ]);
  assert.deepEqual(
    workspace.columns.map(({ id }) => id),
    ['column-0', 'column-1'],
  );
  assert.equal(workspace.transient[0]?.paneId, 'pane-3');
  assert.equal(workspace.transient[0]?.anchorPaneId, 'pane-0');
  assert.equal(workspace.focusedPaneId, 'pane-0');
  assert.deepEqual(paneLayoutFromWorkspace(workspace), layout);
});

test('panes JSON becomes independent tiles and preserves its vertical ratio', () => {
  const panesJson = JSON.stringify([
    {
      type: 'CHANNEL',
      channelId,
      key: 7,
      child: {
        ratio: '2/3',
        pane: { type: 'CHARACTER', spaceId, characterId },
      },
    },
    { type: 'SETTINGS', key: 2 },
  ]);
  const expected: PaneLayout = {
    columns: [
      {
        width: 1,
        collapsed: false,
        tiles: [
          { target: { type: 'CHANNEL', channelId }, weight: 1, collapsed: false },
          {
            target: { type: 'CHARACTER', spaceId, characterId },
            weight: 2,
            collapsed: false,
          },
        ],
      },
      {
        width: 1,
        collapsed: false,
        tiles: [defaultTile({ type: 'SETTINGS' })],
      },
    ],
    transient: [],
  };

  assert.deepEqual(paneLayoutFromPanesJson(panesJson).unwrap(), expected);
  assert.deepEqual(
    decodePaneLayoutQuery(`route=${spaceId}&panes=${encodeURIComponent(panesJson)}`).unwrap(),
    { layout: expected, source: 'PANES_JSON' },
  );
  assert.equal(
    encodePaneLayoutQuery(expected, spaceId).unwrap(),
    `layout=channel.${channelId}~character.${characterId}@w2!settings`,
  );
});

test('an absent layout is distinct from an explicit empty layout', () => {
  assert.deepEqual(decodePaneLayoutQuery(`route=${spaceId}`).unwrap(), {
    layout: emptyPaneLayout(),
    source: 'EMPTY',
  });
  assert.deepEqual(decodePaneLayoutQuery('layout=').unwrap(), {
    layout: emptyPaneLayout(),
    source: 'LAYOUT',
  });
  assert.deepEqual(decodePaneLayoutQuery('layout=&panes=invalid').unwrap(), {
    layout: emptyPaneLayout(),
    source: 'LAYOUT',
  });
  assert.equal(encodePaneLayoutQuery(emptyPaneLayout()).unwrap(), 'layout=');
});

test('malformed layout and panes JSON return specific errors', () => {
  const errors = [
    [
      decodePaneLayoutQuery('layout=unknown'),
      new Err({ type: 'INVALID_ENCODING', value: 'unknown' }),
    ],
    [
      decodePaneLayoutQuery(`layout=&transient=channel.${channelId}@a0`),
      new Err({ type: 'INVALID_ANCHOR_INDEX', paneIndex: 0, anchorIndex: 0 }),
    ],
    [paneLayoutFromPanesJson('{'), new Err({ type: 'INVALID_PANES_JSON' })],
    [paneLayoutFromPanesJson('{}'), new Err({ type: 'INVALID_PANES_LAYOUT' })],
    [
      paneLayoutFromPanesJson(
        JSON.stringify([
          {
            type: 'CHANNEL',
            channelId,
            child: { ratio: '3/4', pane: { type: 'SETTINGS' } },
          },
        ]),
      ),
      new Err({ type: 'INVALID_PANES_CHILD_RATIO', paneIndex: 0, value: '3/4' }),
    ],
  ];

  for (const [actual, expected] of errors) assert.deepEqual(actual, expected);
});

test('layout validation rejects invalid targets, sizes, references and runtime IDs', () => {
  assert.deepEqual(
    validatePaneLayout({
      columns: [
        {
          width: 0,
          collapsed: false,
          tiles: [defaultTile({ type: 'CHANNEL', channelId })],
        },
      ],
      transient: [],
    }),
    new Err({ type: 'INVALID_COLUMN_SIZE', columnIndex: 0, value: 0 }),
  );
  assert.deepEqual(
    decodePaneTarget('character.not-a-uuid', 2, spaceId),
    new Err({
      type: 'INVALID_TARGET_ID',
      paneIndex: 2,
      targetType: 'CHARACTER',
      field: 'characterId',
      value: 'not-a-uuid',
    }),
  );
  assert.deepEqual(
    decodePaneTarget(`character.${characterId}`, 1),
    new Err({
      type: 'INVALID_TARGET_ID',
      paneIndex: 1,
      targetType: 'CHARACTER',
      field: 'spaceId',
      value: undefined,
    }),
  );
  assert.deepEqual(
    paneWorkspaceFromLayout(layout, {
      paneId: () => 'same',
      columnId: (index) => `column-${index}`,
    }),
    new Err({ type: 'DUPLICATE_RUNTIME_ID', kind: 'PANE', value: 'same' }),
  );
});
