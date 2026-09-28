import assert from 'node:assert/strict';
import test from 'node:test';
import { Err } from '@boluo/utils/result';
import {
  applyPaneWorkspaceCommand,
  applyPaneWorkspaceCommandOrThrow,
  assertPaneWorkspace,
  emptyPaneWorkspace,
  findPanePlacement,
  validatePaneWorkspace,
} from './pane-workspace';
import type {
  PaneDestination,
  PaneInstance,
  PaneWorkspace,
  PaneWorkspaceCommand,
} from './pane-workspace.types';

const pane = (id: string, channelId = id): PaneInstance => ({
  id,
  target: { type: 'CHANNEL', channelId },
});

const apply = (workspace: PaneWorkspace, command: PaneWorkspaceCommand): PaneWorkspace =>
  applyPaneWorkspaceCommand(workspace, command).unwrap();

const open = (
  workspace: PaneWorkspace,
  paneId: string,
  destination: PaneDestination,
): PaneWorkspace => apply(workspace, { type: 'OPEN_PANE', pane: pane(paneId), destination });

const workspaceWithThreePanes = () => {
  let workspace = open(emptyPaneWorkspace(), 'a', {
    type: 'NEW_COLUMN',
    columnId: 'left',
  });
  workspace = open(workspace, 'b', { type: 'COLUMN', columnId: 'left' });
  workspace = open(workspace, 'c', {
    type: 'NEW_COLUMN',
    columnId: 'right',
  });
  return workspace;
};

test('opens panes into columns and transient space with deterministic defaults', () => {
  let workspace = open(emptyPaneWorkspace(), 'channel', {
    type: 'NEW_COLUMN',
    columnId: 'main',
  });
  workspace = open(workspace, 'character', {
    type: 'COLUMN',
    columnId: 'main',
    index: 0,
    weight: 2,
  });
  workspace = open(workspace, 'settings', {
    type: 'TRANSIENT',
    anchorPaneId: 'channel',
  });

  assert.deepEqual(workspace, {
    panes: {
      channel: pane('channel'),
      character: pane('character'),
      settings: pane('settings'),
    },
    columns: [
      {
        id: 'main',
        width: 1,
        collapsed: false,
        tiles: [
          { paneId: 'character', weight: 2, collapsed: false },
          { paneId: 'channel', weight: 1, collapsed: false },
        ],
      },
    ],
    transient: [{ paneId: 'settings', anchorPaneId: 'channel' }],
    focusedPaneId: 'settings',
  });
  assert.deepEqual(findPanePlacement(workspace, 'character'), {
    type: 'COLUMN',
    columnId: 'main',
    columnIndex: 0,
    tileIndex: 0,
  });
  assert.deepEqual(findPanePlacement(workspace, 'settings'), { type: 'TRANSIENT', index: 0 });
});

test('closing the focused pane chooses a nearby pane and clears transient anchors', () => {
  let workspace = workspaceWithThreePanes();
  workspace = open(workspace, 'modal', {
    type: 'TRANSIENT',
    anchorPaneId: 'b',
  });
  workspace = apply(workspace, { type: 'FOCUS_PANE', paneId: 'b' });
  workspace = apply(workspace, { type: 'CLOSE_PANE', paneId: 'b' });

  assert.equal(workspace.focusedPaneId, 'a');
  assert.deepEqual(
    workspace.columns[0]?.tiles.map(({ paneId }) => paneId),
    ['a'],
  );
  assert.equal(workspace.transient[0]?.anchorPaneId, null);

  workspace = apply(workspace, { type: 'CLOSE_PANE', paneId: 'a' });
  assert.equal(workspace.focusedPaneId, 'c');
  assert.deepEqual(
    workspace.columns.map(({ id }) => id),
    ['right'],
  );
});

test('replacing a pane creates a new instance without changing its layout', () => {
  let initial = workspaceWithThreePanes();
  initial = open(initial, 'modal', { type: 'TRANSIENT', anchorPaneId: 'b' });
  initial = apply(initial, { type: 'FOCUS_PANE', paneId: 'b' });
  const replaced = apply(initial, {
    type: 'REPLACE_PANE',
    paneId: 'b',
    pane: pane('replacement'),
  });

  assert.equal(replaced.panes.b, undefined);
  assert.deepEqual(replaced.panes.replacement, pane('replacement'));
  assert.deepEqual(replaced.columns[0]?.tiles, [
    { paneId: 'a', weight: 1, collapsed: false },
    { paneId: 'replacement', weight: 1, collapsed: false },
  ]);
  assert.equal(replaced.focusedPaneId, 'replacement');
  assert.equal(replaced.transient[0]?.anchorPaneId, 'replacement');
  assert.deepEqual(
    initial.columns[0]?.tiles.map(({ paneId }) => paneId),
    ['a', 'b'],
  );
});

test('moving a pane preserves its identity and sizing state', () => {
  let workspace = workspaceWithThreePanes();
  const instance = workspace.panes.b;
  workspace = apply(workspace, { type: 'SET_TILE_WEIGHT', paneId: 'b', weight: 3 });
  workspace = apply(workspace, { type: 'SET_PANE_COLLAPSED', paneId: 'b', collapsed: true });
  workspace = apply(workspace, {
    type: 'MOVE_PANE',
    paneId: 'b',
    destination: { type: 'COLUMN', columnId: 'right', index: 0 },
  });

  assert.deepEqual(
    workspace.columns[0]?.tiles.map(({ paneId }) => paneId),
    ['a'],
  );
  assert.deepEqual(workspace.columns[1]?.tiles, [
    { paneId: 'b', weight: 3, collapsed: true },
    { paneId: 'c', weight: 1, collapsed: false },
  ]);
  assert.strictEqual(workspace.panes.b, instance);

  workspace = apply(workspace, {
    type: 'MOVE_PANE',
    paneId: 'b',
    destination: { type: 'COLUMN', columnId: 'right', index: 1 },
  });
  assert.deepEqual(
    workspace.columns[1]?.tiles.map(({ paneId }) => paneId),
    ['c', 'b'],
  );
});

test('a pane can move between tiled and transient placement without changing identity', () => {
  let workspace = workspaceWithThreePanes();
  const instance = workspace.panes.b;
  workspace = apply(workspace, {
    type: 'MOVE_PANE',
    paneId: 'b',
    destination: { type: 'TRANSIENT', anchorPaneId: 'c' },
  });
  assert.deepEqual(findPanePlacement(workspace, 'b'), { type: 'TRANSIENT', index: 0 });
  assert.strictEqual(workspace.panes.b, instance);

  workspace = apply(workspace, {
    type: 'MOVE_PANE',
    paneId: 'b',
    destination: { type: 'NEW_COLUMN', columnId: 'pinned', index: 1 },
  });
  assert.deepEqual(findPanePlacement(workspace, 'b'), {
    type: 'COLUMN',
    columnId: 'pinned',
    columnIndex: 1,
    tileIndex: 0,
  });
  assert.strictEqual(workspace.panes.b, instance);
});

test('moving a column preserves the column and all pane instances within it', () => {
  const workspace = workspaceWithThreePanes();
  const left = workspace.columns[0];
  const moved = apply(workspace, { type: 'MOVE_COLUMN', columnId: 'left', index: 1 });

  assert.deepEqual(
    moved.columns.map(({ id }) => id),
    ['right', 'left'],
  );
  assert.strictEqual(moved.columns[1], left);
  assert.strictEqual(moved.panes.a, workspace.panes.a);
  assert.strictEqual(moved.panes.b, workspace.panes.b);
});

test("moving a column's last pane removes the empty source column", () => {
  const workspace = workspaceWithThreePanes();
  const moved = apply(workspace, {
    type: 'MOVE_PANE',
    paneId: 'c',
    destination: { type: 'COLUMN', columnId: 'left', index: 1 },
  });

  assert.deepEqual(
    moved.columns.map(({ id }) => id),
    ['left'],
  );
  assert.deepEqual(
    moved.columns[0]?.tiles.map(({ paneId }) => paneId),
    ['a', 'c', 'b'],
  );
});

test('column and pane collapse are independent from their remembered sizes', () => {
  let workspace = workspaceWithThreePanes();
  workspace = apply(workspace, { type: 'SET_COLUMN_WIDTH', columnId: 'left', width: 1.5 });
  workspace = apply(workspace, {
    type: 'SET_COLUMN_COLLAPSED',
    columnId: 'left',
    collapsed: true,
  });
  workspace = apply(workspace, { type: 'SET_TILE_WEIGHT', paneId: 'a', weight: 2 });
  workspace = apply(workspace, { type: 'SET_PANE_COLLAPSED', paneId: 'a', collapsed: true });

  assert.deepEqual(workspace.columns[0], {
    id: 'left',
    width: 1.5,
    collapsed: true,
    tiles: [
      { paneId: 'a', weight: 2, collapsed: true },
      { paneId: 'b', weight: 1, collapsed: false },
    ],
  });
});

test('recoverable command errors leave the original workspace unchanged', () => {
  const workspace = workspaceWithThreePanes();
  const writes = [
    [
      { type: 'OPEN_PANE', pane: pane('a'), destination: { type: 'TRANSIENT' } },
      { type: 'PANE_ALREADY_EXISTS', paneId: 'a' },
    ],
    [
      {
        type: 'MOVE_PANE',
        paneId: 'b',
        destination: { type: 'COLUMN', columnId: 'missing' },
      },
      { type: 'COLUMN_NOT_FOUND', columnId: 'missing' },
    ],
    [
      {
        type: 'MOVE_PANE',
        paneId: 'b',
        destination: { type: 'TRANSIENT', anchorPaneId: 'b' },
      },
      { type: 'INVALID_ANCHOR', paneId: 'b', anchorPaneId: 'b' },
    ],
    [
      { type: 'SET_COLUMN_WIDTH', columnId: 'left', width: 0 },
      { type: 'INVALID_SIZE', field: 'COLUMN_WIDTH', value: 0 },
    ],
    [
      {
        type: 'MOVE_PANE',
        paneId: 'c',
        destination: { type: 'NEW_COLUMN', columnId: 'right' },
      },
      { type: 'COLUMN_ALREADY_EXISTS', columnId: 'right' },
    ],
    [
      { type: 'SET_PANE_COLLAPSED', paneId: 'missing', collapsed: true },
      { type: 'PANE_NOT_FOUND', paneId: 'missing' },
    ],
  ] as const;

  for (const [command, error] of writes) {
    assert.deepEqual(
      applyPaneWorkspaceCommand(workspace, command as PaneWorkspaceCommand),
      new Err(error),
    );
    assertPaneWorkspace(workspace);
  }
});

test('invalid workspace states are rejected as programming errors', () => {
  const workspace = workspaceWithThreePanes();
  const duplicate = {
    ...workspace,
    transient: [{ paneId: 'a', anchorPaneId: null }],
  };
  const validation = validatePaneWorkspace(duplicate);
  assert.ok(validation.isErr);
  assert.deepEqual(validation.err, { type: 'PANE_PLACED_MULTIPLE_TIMES', paneId: 'a' });
  assert.throws(() => applyPaneWorkspaceCommand(duplicate, { type: 'FOCUS_PANE', paneId: 'a' }));
});

test('throwing command application preserves structured error details', () => {
  const workspace = workspaceWithThreePanes();
  assert.throws(
    () =>
      applyPaneWorkspaceCommandOrThrow(workspace, {
        type: 'CLOSE_PANE',
        paneId: 'missing',
      }),
    {
      message: 'Cannot apply pane workspace command: PANE_NOT_FOUND',
      cause: { type: 'PANE_NOT_FOUND', paneId: 'missing' },
    },
  );
});
