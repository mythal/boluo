import { Err, Ok, type Result } from '@boluo/utils/result';
import { isUuid, makeId } from '@boluo/utils/id';
import {
  DEFAULT_PANE_COLUMN_WIDTH,
  DEFAULT_PANE_TILE_WEIGHT,
  assertPaneWorkspace,
} from './pane-workspace';
import type {
  PaneColumn,
  PaneId,
  PaneInstance,
  PaneTarget,
  PaneWorkspace,
} from './pane-workspace.types';
import type {
  PaneLayout,
  PaneLayoutColumn,
  PaneLayoutError,
  PaneLayoutTile,
  PaneWorkspaceIdFactory,
} from './pane-layout.types';

export const emptyPaneLayout = (): PaneLayout => ({
  columns: [],
  transient: [],
});

const validSize = (value: number): boolean => Number.isFinite(value) && value > 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value != null && !Array.isArray(value);

const paneTargetId = (
  value: unknown,
  paneIndex: number,
  targetType: PaneTarget['type'],
  field: 'spaceId' | 'channelId' | 'characterId' | 'userId',
): Result<string, PaneLayoutError> => {
  if (!isUuid(value)) {
    return new Err({ type: 'INVALID_TARGET_ID', paneIndex, targetType, field, value });
  }
  return new Ok(value);
};

export const parsePaneTarget = (
  value: unknown,
  paneIndex: number,
): Result<PaneTarget, PaneLayoutError> => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return new Err({
      type: 'INVALID_TARGET',
      paneIndex,
      targetType: isRecord(value) ? value.type : undefined,
    });
  }
  const targetType = value.type;
  switch (targetType) {
    case 'SPACE':
    case 'SPACE_SETTINGS':
    case 'SPACE_GREETING':
    case 'CREATE_CHANNEL':
    case 'SPACE_MEMBERS': {
      const spaceId = paneTargetId(value.spaceId, paneIndex, targetType, 'spaceId');
      return spaceId.isErr ? spaceId : new Ok({ type: targetType, spaceId: spaceId.some });
    }
    case 'CHANNEL':
    case 'CHANNEL_SETTINGS':
    case 'CHANNEL_TOPIC':
    case 'CHANNEL_EXPORT': {
      const channelId = paneTargetId(value.channelId, paneIndex, targetType, 'channelId');
      return channelId.isErr ? channelId : new Ok({ type: targetType, channelId: channelId.some });
    }
    case 'CHARACTER': {
      const spaceId = paneTargetId(value.spaceId, paneIndex, targetType, 'spaceId');
      if (spaceId.isErr) return spaceId;
      const characterId = paneTargetId(value.characterId, paneIndex, targetType, 'characterId');
      return characterId.isErr
        ? characterId
        : new Ok({ type: targetType, spaceId: spaceId.some, characterId: characterId.some });
    }
    case 'PROFILE': {
      const userId = paneTargetId(value.userId, paneIndex, targetType, 'userId');
      return userId.isErr ? userId : new Ok({ type: targetType, userId: userId.some });
    }
    case 'EMPTY':
    case 'SETTINGS':
    case 'HELP':
    case 'WELCOME':
    case 'CREATE_SPACE':
    case 'LOGIN':
    case 'SIGN_UP':
    case 'RESET_PASSWORD':
      return new Ok({ type: targetType });
    default:
      return new Err({ type: 'INVALID_TARGET', paneIndex, targetType });
  }
};

export const validatePaneLayout = (layout: PaneLayout): Result<void, PaneLayoutError> => {
  let paneIndex = 0;
  for (const [columnIndex, column] of layout.columns.entries()) {
    if (column.tiles.length === 0) return new Err({ type: 'EMPTY_COLUMN', columnIndex });
    if (!validSize(column.width)) {
      return new Err({ type: 'INVALID_COLUMN_SIZE', columnIndex, value: column.width });
    }
    for (const tile of column.tiles) {
      if (!validSize(tile.weight)) {
        return new Err({ type: 'INVALID_TILE_SIZE', paneIndex, value: tile.weight });
      }
      const target = parsePaneTarget(tile.target, paneIndex);
      if (target.isErr) return target;
      paneIndex++;
    }
  }
  const tiledPaneCount = paneIndex;
  for (const transient of layout.transient) {
    const target = parsePaneTarget(transient.target, paneIndex);
    if (target.isErr) return target;
    if (
      transient.anchorIndex != null &&
      (!Number.isSafeInteger(transient.anchorIndex) ||
        transient.anchorIndex < 0 ||
        transient.anchorIndex >= tiledPaneCount + layout.transient.length ||
        transient.anchorIndex === paneIndex)
    ) {
      return new Err({
        type: 'INVALID_ANCHOR_INDEX',
        paneIndex,
        anchorIndex: transient.anchorIndex,
      });
    }
    paneIndex++;
  }
  return new Ok(undefined);
};

const defaultIdFactory: PaneWorkspaceIdFactory = {
  paneId: () => makeId(),
  columnId: () => makeId(),
};

const createRuntimeIds = <Id extends string>(
  count: number,
  kind: 'PANE' | 'COLUMN',
  createId: (index: number) => Id,
): Result<Id[], PaneLayoutError> => {
  const ids: Id[] = [];
  const seen = new Set<Id>();
  for (let index = 0; index < count; index++) {
    const id = createId(index);
    if (id.length === 0) {
      return new Err({ type: 'INVALID_RUNTIME_ID', kind, index, value: id });
    }
    if (seen.has(id)) return new Err({ type: 'DUPLICATE_RUNTIME_ID', kind, value: id });
    seen.add(id);
    ids.push(id);
  }
  return new Ok(ids);
};

export const paneWorkspaceFromLayout = (
  layout: PaneLayout,
  idFactory: PaneWorkspaceIdFactory = defaultIdFactory,
): Result<PaneWorkspace, PaneLayoutError> => {
  const validation = validatePaneLayout(layout);
  if (validation.isErr) return validation;

  const paneCount =
    layout.columns.reduce((count, column) => count + column.tiles.length, 0) +
    layout.transient.length;
  const paneIds = createRuntimeIds(paneCount, 'PANE', idFactory.paneId);
  if (paneIds.isErr) return paneIds;
  const columnIds = createRuntimeIds(layout.columns.length, 'COLUMN', idFactory.columnId);
  if (columnIds.isErr) return columnIds;

  const panes = Object.create(null) as Record<PaneId, PaneInstance>;
  const columns: PaneColumn[] = [];
  let paneIndex = 0;
  for (const [columnIndex, column] of layout.columns.entries()) {
    const tiles = column.tiles.map((tile) => {
      const paneId = paneIds.some[paneIndex]!;
      panes[paneId] = { id: paneId, target: tile.target };
      paneIndex++;
      return { paneId, weight: tile.weight, collapsed: tile.collapsed };
    });
    columns.push({
      id: columnIds.some[columnIndex]!,
      width: column.width,
      collapsed: column.collapsed,
      tiles,
    });
  }
  const transient = layout.transient.map((item) => {
    const paneId = paneIds.some[paneIndex]!;
    panes[paneId] = { id: paneId, target: item.target };
    paneIndex++;
    return {
      paneId,
      anchorPaneId: item.anchorIndex == null ? null : paneIds.some[item.anchorIndex]!,
    };
  });
  const workspace: PaneWorkspace = {
    panes,
    columns,
    transient,
    focusedPaneId: paneIds.some[0] ?? null,
  };
  assertPaneWorkspace(workspace);
  return new Ok(workspace);
};

export const paneLayoutFromWorkspace = (workspace: PaneWorkspace): PaneLayout => {
  assertPaneWorkspace(workspace);
  const paneIds = [
    ...workspace.columns.flatMap((column) => column.tiles.map((tile) => tile.paneId)),
    ...workspace.transient.map((pane) => pane.paneId),
  ];
  const paneIndexes = new Map(paneIds.map((paneId, index) => [paneId, index]));
  return {
    columns: workspace.columns.map((column): PaneLayoutColumn => ({
      width: column.width,
      collapsed: column.collapsed,
      tiles: column.tiles.map((tile): PaneLayoutTile => ({
        target: workspace.panes[tile.paneId]!.target,
        weight: tile.weight,
        collapsed: tile.collapsed,
      })),
    })),
    transient: workspace.transient.map((pane) => ({
      target: workspace.panes[pane.paneId]!.target,
      anchorIndex: pane.anchorPaneId == null ? null : paneIndexes.get(pane.anchorPaneId)!,
    })),
  };
};

const panesJsonRatioWeights = {
  '1/2': [1, 1],
  '2/3': [1, 2],
  '1/3': [2, 1],
} as const;

export const paneLayoutFromPanesJson = (raw: string): Result<PaneLayout, PaneLayoutError> => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return new Err({ type: 'INVALID_PANES_JSON' });
  }
  if (!Array.isArray(value)) return new Err({ type: 'INVALID_PANES_LAYOUT' });

  const columns: PaneLayoutColumn[] = [];
  let paneIndex = 0;
  for (const item of value) {
    if (!isRecord(item)) return new Err({ type: 'INVALID_PANES_LAYOUT' });
    const parent = parsePaneTarget(item, paneIndex);
    if (parent.isErr) return parent;
    let tiles: PaneLayoutTile[] = [
      { target: parent.some, weight: DEFAULT_PANE_TILE_WEIGHT, collapsed: false },
    ];
    const child = item.child;
    if (child != null) {
      if (!isRecord(child) || !isRecord(child.pane)) {
        return new Err({ type: 'INVALID_PANES_LAYOUT' });
      }
      const weights = panesJsonRatioWeights[child.ratio as keyof typeof panesJsonRatioWeights];
      if (!weights) {
        return new Err({
          type: 'INVALID_PANES_CHILD_RATIO',
          paneIndex,
          value: child.ratio,
        });
      }
      const childTarget = parsePaneTarget(child.pane, paneIndex + 1);
      if (childTarget.isErr) return childTarget;
      tiles = [
        { target: parent.some, weight: weights[0], collapsed: false },
        { target: childTarget.some, weight: weights[1], collapsed: false },
      ];
    }
    columns.push({
      width: DEFAULT_PANE_COLUMN_WIDTH,
      collapsed: false,
      tiles,
    });
    paneIndex += tiles.length;
  }
  return new Ok({
    columns,
    transient: [],
  });
};
