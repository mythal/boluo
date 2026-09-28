import { Err, Ok, type Result } from '@boluo/utils/result';
import type {
  PaneColumn,
  PaneColumnId,
  PaneDestination,
  PaneId,
  PaneInstance,
  PanePlacement,
  PaneTile,
  PaneWorkspace,
  PaneWorkspaceCommand,
  PaneWorkspaceError,
  PaneWorkspaceInvariantError,
  TransientPane,
} from './pane-workspace.types';

export const DEFAULT_PANE_COLUMN_WIDTH = 1;
export const DEFAULT_PANE_TILE_WEIGHT = 1;

export const emptyPaneWorkspace = (): PaneWorkspace => ({
  panes: {},
  columns: [],
  transient: [],
  focusedPaneId: null,
});

const hasOwn = (record: Record<string, unknown>, id: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, id);

const validId = (id: string): boolean => id.length > 0;
const validSize = (size: number): boolean => Number.isFinite(size) && size > 0;

export const findPanePlacement = (
  workspace: PaneWorkspace,
  paneId: PaneId,
): PanePlacement | null => {
  for (const [columnIndex, column] of workspace.columns.entries()) {
    const tileIndex = column.tiles.findIndex((tile) => tile.paneId === paneId);
    if (tileIndex !== -1) {
      return { type: 'COLUMN', columnId: column.id, columnIndex, tileIndex };
    }
  }
  const index = workspace.transient.findIndex((pane) => pane.paneId === paneId);
  return index === -1 ? null : { type: 'TRANSIENT', index };
};

export const validatePaneWorkspace = (
  workspace: PaneWorkspace,
): Result<void, PaneWorkspaceInvariantError> => {
  const placed = new Set<PaneId>();
  const columnIds = new Set<PaneColumnId>();

  for (const column of workspace.columns) {
    if (!validId(column.id)) return new Err({ type: 'INVALID_COLUMN_ID', columnId: column.id });
    if (columnIds.has(column.id)) {
      return new Err({ type: 'DUPLICATE_COLUMN_ID', columnId: column.id });
    }
    columnIds.add(column.id);
    if (column.tiles.length === 0) return new Err({ type: 'EMPTY_COLUMN', columnId: column.id });
    if (!validSize(column.width)) {
      return new Err({ type: 'INVALID_SIZE', field: 'COLUMN_WIDTH', value: column.width });
    }
    for (const tile of column.tiles) {
      if (!hasOwn(workspace.panes, tile.paneId)) {
        return new Err({ type: 'PLACED_PANE_NOT_FOUND', paneId: tile.paneId });
      }
      if (placed.has(tile.paneId)) {
        return new Err({ type: 'PANE_PLACED_MULTIPLE_TIMES', paneId: tile.paneId });
      }
      if (!validSize(tile.weight)) {
        return new Err({ type: 'INVALID_SIZE', field: 'TILE_WEIGHT', value: tile.weight });
      }
      placed.add(tile.paneId);
    }
  }

  for (const transient of workspace.transient) {
    if (!hasOwn(workspace.panes, transient.paneId)) {
      return new Err({ type: 'PLACED_PANE_NOT_FOUND', paneId: transient.paneId });
    }
    if (placed.has(transient.paneId)) {
      return new Err({ type: 'PANE_PLACED_MULTIPLE_TIMES', paneId: transient.paneId });
    }
    if (
      transient.anchorPaneId != null &&
      (transient.anchorPaneId === transient.paneId ||
        !hasOwn(workspace.panes, transient.anchorPaneId))
    ) {
      return new Err({
        type: 'INVALID_ANCHOR',
        paneId: transient.paneId,
        anchorPaneId: transient.anchorPaneId,
      });
    }
    placed.add(transient.paneId);
  }

  for (const [paneId, pane] of Object.entries(workspace.panes)) {
    if (!validId(paneId) || pane.id !== paneId) {
      return new Err({ type: 'INVALID_PANE_ID', paneId });
    }
    if (!placed.has(paneId)) return new Err({ type: 'UNPLACED_PANE', paneId });
  }

  if (placed.size === 0) {
    if (workspace.focusedPaneId != null) {
      return new Err({ type: 'INVALID_FOCUS', paneId: workspace.focusedPaneId });
    }
  } else if (workspace.focusedPaneId == null) {
    return new Err({ type: 'MISSING_FOCUS' });
  } else if (!hasOwn(workspace.panes, workspace.focusedPaneId)) {
    return new Err({ type: 'INVALID_FOCUS', paneId: workspace.focusedPaneId });
  }

  return new Ok(undefined);
};

export const assertPaneWorkspace = (workspace: PaneWorkspace): void => {
  const result = validatePaneWorkspace(workspace);
  if (result.isErr) {
    throw new Error(`Invalid pane workspace: ${result.err.type}`, { cause: result.err });
  }
};

const destinationIndex = (
  destination: PaneDestination,
  max: number,
): Result<number, PaneWorkspaceError> => {
  const index = destination.index ?? max;
  if (!Number.isSafeInteger(index) || index < 0 || index > max) {
    return new Err({ type: 'INVALID_INDEX', destination: destination.type, index, max });
  }
  return new Ok(index);
};

const validateDestinationSize = (destination: PaneDestination): PaneWorkspaceError | null => {
  if (destination.type === 'NEW_COLUMN' && !validSize(destination.width ?? 1)) {
    return {
      type: 'INVALID_SIZE',
      field: 'COLUMN_WIDTH',
      value: destination.width ?? 1,
    };
  }
  if (destination.type !== 'TRANSIENT' && !validSize(destination.weight ?? 1)) {
    return {
      type: 'INVALID_SIZE',
      field: 'TILE_WEIGHT',
      value: destination.weight ?? 1,
    };
  }
  return null;
};

const validateAnchor = (
  workspace: PaneWorkspace,
  paneId: PaneId,
  anchorPaneId: PaneId | null | undefined,
): PaneWorkspaceError | null => {
  if (anchorPaneId != null && (anchorPaneId === paneId || !hasOwn(workspace.panes, anchorPaneId))) {
    return { type: 'INVALID_ANCHOR', paneId, anchorPaneId };
  }
  return null;
};

interface RemovedPane {
  workspace: PaneWorkspace;
  tile?: PaneTile;
  fallbackPaneId: PaneId | null;
}

const removePanePlacement = (workspace: PaneWorkspace, placement: PanePlacement): RemovedPane => {
  if (placement.type === 'TRANSIENT') {
    const transient = workspace.transient.filter((_, index) => index !== placement.index);
    const fallbackPaneId =
      transient[Math.min(placement.index, transient.length - 1)]?.paneId ??
      workspace.columns[0]?.tiles[0]?.paneId ??
      null;
    return { workspace: { ...workspace, transient }, fallbackPaneId };
  }

  const sourceColumn = workspace.columns[placement.columnIndex]!;
  const tile = sourceColumn.tiles[placement.tileIndex]!;
  const tiles = sourceColumn.tiles.filter((_, index) => index !== placement.tileIndex);
  if (tiles.length > 0) {
    const columns = [...workspace.columns];
    columns[placement.columnIndex] = { ...sourceColumn, tiles };
    const fallbackPaneId = tiles[Math.min(placement.tileIndex, tiles.length - 1)]!.paneId;
    return { workspace: { ...workspace, columns }, tile, fallbackPaneId };
  }

  const columns = workspace.columns.filter((_, index) => index !== placement.columnIndex);
  const fallbackPaneId =
    columns[Math.min(placement.columnIndex, columns.length - 1)]?.tiles[0]?.paneId ??
    workspace.transient.at(-1)?.paneId ??
    null;
  return {
    workspace: { ...workspace, columns },
    tile,
    fallbackPaneId,
  };
};

const placePane = (
  workspace: PaneWorkspace,
  paneId: PaneId,
  destination: PaneDestination,
  previousTile?: PaneTile,
): Result<PaneWorkspace, PaneWorkspaceError> => {
  const sizeError = validateDestinationSize(destination);
  if (sizeError) return new Err(sizeError);

  if (destination.type === 'TRANSIENT') {
    const anchorError = validateAnchor(workspace, paneId, destination.anchorPaneId);
    if (anchorError) return new Err(anchorError);
    const indexResult = destinationIndex(destination, workspace.transient.length);
    if (indexResult.isErr) return indexResult;
    const transient = [...workspace.transient];
    transient.splice(indexResult.some, 0, {
      paneId,
      anchorPaneId: destination.anchorPaneId ?? null,
    });
    return new Ok({ ...workspace, transient });
  }

  const tile: PaneTile = {
    paneId,
    weight: destination.weight ?? previousTile?.weight ?? DEFAULT_PANE_TILE_WEIGHT,
    collapsed: previousTile?.collapsed ?? false,
  };
  if (destination.type === 'COLUMN') {
    const columnIndex = workspace.columns.findIndex((column) => column.id === destination.columnId);
    if (columnIndex === -1) {
      return new Err({ type: 'COLUMN_NOT_FOUND', columnId: destination.columnId });
    }
    const column = workspace.columns[columnIndex]!;
    const indexResult = destinationIndex(destination, column.tiles.length);
    if (indexResult.isErr) return indexResult;
    const tiles = [...column.tiles];
    tiles.splice(indexResult.some, 0, tile);
    const columns = [...workspace.columns];
    columns[columnIndex] = { ...column, tiles };
    return new Ok({ ...workspace, columns });
  }

  if (!validId(destination.columnId)) {
    return new Err({ type: 'INVALID_COLUMN_ID', columnId: destination.columnId });
  }
  if (workspace.columns.some((column) => column.id === destination.columnId)) {
    return new Err({ type: 'COLUMN_ALREADY_EXISTS', columnId: destination.columnId });
  }
  const indexResult = destinationIndex(destination, workspace.columns.length);
  if (indexResult.isErr) return indexResult;
  const column: PaneColumn = {
    id: destination.columnId,
    width: destination.width ?? DEFAULT_PANE_COLUMN_WIDTH,
    collapsed: false,
    tiles: [tile],
  };
  const columns = [...workspace.columns];
  columns.splice(indexResult.some, 0, column);
  return new Ok({ ...workspace, columns });
};

const openPane = (
  workspace: PaneWorkspace,
  pane: PaneInstance,
  destination: PaneDestination,
): Result<PaneWorkspace, PaneWorkspaceError> => {
  if (!validId(pane.id)) return new Err({ type: 'INVALID_PANE_ID', paneId: pane.id });
  if (hasOwn(workspace.panes, pane.id)) {
    return new Err({ type: 'PANE_ALREADY_EXISTS', paneId: pane.id });
  }
  const withPane = {
    ...workspace,
    panes: { ...workspace.panes, [pane.id]: pane },
  };
  const placed = placePane(withPane, pane.id, destination);
  if (placed.isErr) return placed;
  return new Ok({ ...placed.some, focusedPaneId: pane.id });
};

const closePane = (
  workspace: PaneWorkspace,
  paneId: PaneId,
): Result<PaneWorkspace, PaneWorkspaceError> => {
  const placement = findPanePlacement(workspace, paneId);
  if (!placement) return new Err({ type: 'PANE_NOT_FOUND', paneId });
  const removed = removePanePlacement(workspace, placement);
  const panes = { ...removed.workspace.panes };
  delete panes[paneId];
  const transient = removed.workspace.transient.map((pane): TransientPane =>
    pane.anchorPaneId === paneId ? { ...pane, anchorPaneId: null } : pane,
  );
  return new Ok({
    ...removed.workspace,
    panes,
    transient,
    focusedPaneId:
      workspace.focusedPaneId === paneId ? removed.fallbackPaneId : workspace.focusedPaneId,
  });
};

const replacePane = (
  workspace: PaneWorkspace,
  paneId: PaneId,
  pane: PaneInstance,
): Result<PaneWorkspace, PaneWorkspaceError> => {
  if (!hasOwn(workspace.panes, paneId)) return new Err({ type: 'PANE_NOT_FOUND', paneId });
  if (!validId(pane.id)) return new Err({ type: 'INVALID_PANE_ID', paneId: pane.id });
  if (hasOwn(workspace.panes, pane.id)) {
    return new Err({ type: 'PANE_ALREADY_EXISTS', paneId: pane.id });
  }
  const panes = { ...workspace.panes };
  delete panes[paneId];
  panes[pane.id] = pane;
  const placement = findPanePlacement(workspace, paneId)!;
  let columns = workspace.columns;
  if (placement.type === 'COLUMN') {
    const column = columns[placement.columnIndex]!;
    const tiles = [...column.tiles];
    tiles[placement.tileIndex] = { ...tiles[placement.tileIndex]!, paneId: pane.id };
    columns = [...columns];
    columns[placement.columnIndex] = { ...column, tiles };
  }
  const transient = workspace.transient.map((item): TransientPane => ({
    paneId: item.paneId === paneId ? pane.id : item.paneId,
    anchorPaneId: item.anchorPaneId === paneId ? pane.id : item.anchorPaneId,
  }));
  return new Ok({
    panes,
    columns,
    transient,
    focusedPaneId: workspace.focusedPaneId === paneId ? pane.id : workspace.focusedPaneId,
  });
};

const movePane = (
  workspace: PaneWorkspace,
  paneId: PaneId,
  destination: PaneDestination,
): Result<PaneWorkspace, PaneWorkspaceError> => {
  const placement = findPanePlacement(workspace, paneId);
  if (!placement) return new Err({ type: 'PANE_NOT_FOUND', paneId });
  const sizeError = validateDestinationSize(destination);
  if (sizeError) return new Err(sizeError);
  if (
    destination.type === 'NEW_COLUMN' &&
    workspace.columns.some((column) => column.id === destination.columnId)
  ) {
    return new Err({ type: 'COLUMN_ALREADY_EXISTS', columnId: destination.columnId });
  }

  if (placement.type === 'COLUMN' && destination.type === 'COLUMN') {
    const sourceColumn = workspace.columns[placement.columnIndex]!;
    if (sourceColumn.id === destination.columnId) {
      const indexResult = destinationIndex(destination, sourceColumn.tiles.length - 1);
      if (indexResult.isErr) return indexResult;
      const sourceTile = sourceColumn.tiles[placement.tileIndex]!;
      if (
        indexResult.some === placement.tileIndex &&
        (destination.weight == null || destination.weight === sourceTile.weight)
      ) {
        return new Ok(workspace);
      }
      const tiles = sourceColumn.tiles.filter((_, index) => index !== placement.tileIndex);
      tiles.splice(indexResult.some, 0, {
        ...sourceTile,
        weight: destination.weight ?? sourceTile.weight,
      });
      const columns = [...workspace.columns];
      columns[placement.columnIndex] = { ...sourceColumn, tiles };
      return new Ok({ ...workspace, columns });
    }
  }

  const removed = removePanePlacement(workspace, placement);
  const placed = placePane(removed.workspace, paneId, destination, removed.tile);
  if (placed.isErr) return placed;
  return new Ok(placed.some);
};

const moveColumn = (
  workspace: PaneWorkspace,
  columnId: PaneColumnId,
  index: number,
): Result<PaneWorkspace, PaneWorkspaceError> => {
  const from = workspace.columns.findIndex((column) => column.id === columnId);
  if (from === -1) return new Err({ type: 'COLUMN_NOT_FOUND', columnId });
  const max = workspace.columns.length - 1;
  if (!Number.isSafeInteger(index) || index < 0 || index > max) {
    return new Err({ type: 'INVALID_INDEX', destination: 'COLUMN_ORDER', index, max });
  }
  if (from === index) return new Ok(workspace);
  const column = workspace.columns[from]!;
  const columns = workspace.columns.filter((_, current) => current !== from);
  columns.splice(index, 0, column);
  return new Ok({ ...workspace, columns });
};

const setColumnWidth = (
  workspace: PaneWorkspace,
  columnId: PaneColumnId,
  width: number,
): Result<PaneWorkspace, PaneWorkspaceError> => {
  const index = workspace.columns.findIndex((column) => column.id === columnId);
  if (index === -1) return new Err({ type: 'COLUMN_NOT_FOUND', columnId });
  if (!validSize(width))
    return new Err({ type: 'INVALID_SIZE', field: 'COLUMN_WIDTH', value: width });
  if (workspace.columns[index]!.width === width) return new Ok(workspace);
  const columns = [...workspace.columns];
  columns[index] = { ...columns[index]!, width };
  return new Ok({ ...workspace, columns });
};

const updateTile = (
  workspace: PaneWorkspace,
  paneId: PaneId,
  update: (tile: PaneTile) => PaneTile,
): Result<PaneWorkspace, PaneWorkspaceError> => {
  const placement = findPanePlacement(workspace, paneId);
  if (!placement) return new Err({ type: 'PANE_NOT_FOUND', paneId });
  if (placement.type === 'TRANSIENT') return new Err({ type: 'PANE_NOT_TILED', paneId });
  const column = workspace.columns[placement.columnIndex]!;
  const previous = column.tiles[placement.tileIndex]!;
  const next = update(previous);
  if (next === previous) return new Ok(workspace);
  const tiles = [...column.tiles];
  tiles[placement.tileIndex] = next;
  const columns = [...workspace.columns];
  columns[placement.columnIndex] = { ...column, tiles };
  return new Ok({ ...workspace, columns });
};

const setTileWeight = (
  workspace: PaneWorkspace,
  paneId: PaneId,
  weight: number,
): Result<PaneWorkspace, PaneWorkspaceError> => {
  if (!validSize(weight))
    return new Err({ type: 'INVALID_SIZE', field: 'TILE_WEIGHT', value: weight });
  return updateTile(workspace, paneId, (tile) =>
    tile.weight === weight ? tile : { ...tile, weight },
  );
};

const setColumnCollapsed = (
  workspace: PaneWorkspace,
  columnId: PaneColumnId,
  collapsed: boolean,
): Result<PaneWorkspace, PaneWorkspaceError> => {
  const index = workspace.columns.findIndex((column) => column.id === columnId);
  if (index === -1) return new Err({ type: 'COLUMN_NOT_FOUND', columnId });
  if (workspace.columns[index]!.collapsed === collapsed) return new Ok(workspace);
  const columns = [...workspace.columns];
  columns[index] = { ...columns[index]!, collapsed };
  return new Ok({ ...workspace, columns });
};

const setPaneCollapsed = (
  workspace: PaneWorkspace,
  paneId: PaneId,
  collapsed: boolean,
): Result<PaneWorkspace, PaneWorkspaceError> =>
  updateTile(workspace, paneId, (tile) =>
    tile.collapsed === collapsed ? tile : { ...tile, collapsed },
  );

const focusPane = (
  workspace: PaneWorkspace,
  paneId: PaneId,
): Result<PaneWorkspace, PaneWorkspaceError> => {
  if (!hasOwn(workspace.panes, paneId)) return new Err({ type: 'PANE_NOT_FOUND', paneId });
  return new Ok(
    workspace.focusedPaneId === paneId ? workspace : { ...workspace, focusedPaneId: paneId },
  );
};

export const applyPaneWorkspaceCommand = (
  workspace: PaneWorkspace,
  command: PaneWorkspaceCommand,
): Result<PaneWorkspace, PaneWorkspaceError> => {
  assertPaneWorkspace(workspace);
  let result: Result<PaneWorkspace, PaneWorkspaceError>;
  switch (command.type) {
    case 'OPEN_PANE':
      result = openPane(workspace, command.pane, command.destination);
      break;
    case 'CLOSE_PANE':
      result = closePane(workspace, command.paneId);
      break;
    case 'REPLACE_PANE':
      result = replacePane(workspace, command.paneId, command.pane);
      break;
    case 'MOVE_PANE':
      result = movePane(workspace, command.paneId, command.destination);
      break;
    case 'MOVE_COLUMN':
      result = moveColumn(workspace, command.columnId, command.index);
      break;
    case 'SET_COLUMN_WIDTH':
      result = setColumnWidth(workspace, command.columnId, command.width);
      break;
    case 'SET_TILE_WEIGHT':
      result = setTileWeight(workspace, command.paneId, command.weight);
      break;
    case 'SET_COLUMN_COLLAPSED':
      result = setColumnCollapsed(workspace, command.columnId, command.collapsed);
      break;
    case 'SET_PANE_COLLAPSED':
      result = setPaneCollapsed(workspace, command.paneId, command.collapsed);
      break;
    case 'FOCUS_PANE':
      result = focusPane(workspace, command.paneId);
      break;
  }
  if (result.isOk) assertPaneWorkspace(result.some);
  return result;
};

export const applyPaneWorkspaceCommandOrThrow = (
  workspace: PaneWorkspace,
  command: PaneWorkspaceCommand,
): PaneWorkspace => {
  const result = applyPaneWorkspaceCommand(workspace, command);
  if (result.isErr) {
    throw new Error(`Cannot apply pane workspace command: ${result.err.type}`, {
      cause: result.err,
    });
  }
  return result.some;
};
