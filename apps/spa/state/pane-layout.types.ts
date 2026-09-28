import type { PaneColumnId, PaneId, PaneTarget } from './pane-workspace.types';

export interface PaneLayoutTile {
  target: PaneTarget;
  weight: number;
  collapsed: boolean;
}

export interface PaneLayoutColumn {
  width: number;
  collapsed: boolean;
  tiles: PaneLayoutTile[];
}

export interface PaneLayoutTransient {
  target: PaneTarget;
  /** Index in tiled-then-transient pane order. */
  anchorIndex: number | null;
}

export interface PaneLayout {
  columns: PaneLayoutColumn[];
  transient: PaneLayoutTransient[];
}

export interface PaneWorkspaceIdFactory {
  paneId: (index: number) => PaneId;
  columnId: (index: number) => PaneColumnId;
}

export type PaneLayoutError =
  | { type: 'INVALID_COLUMN_SIZE'; columnIndex: number; value: number }
  | { type: 'INVALID_TILE_SIZE'; paneIndex: number; value: number }
  | { type: 'EMPTY_COLUMN'; columnIndex: number }
  | { type: 'INVALID_ANCHOR_INDEX'; paneIndex: number; anchorIndex: number }
  | { type: 'INVALID_TARGET'; paneIndex: number; targetType: unknown }
  | {
      type: 'INVALID_TARGET_ID';
      paneIndex: number;
      targetType: PaneTarget['type'];
      field: 'spaceId' | 'channelId' | 'characterId' | 'userId';
      value: unknown;
    }
  | { type: 'INVALID_RUNTIME_ID'; kind: 'PANE' | 'COLUMN'; index: number; value: string }
  | { type: 'DUPLICATE_RUNTIME_ID'; kind: 'PANE' | 'COLUMN'; value: string }
  | { type: 'INVALID_ENCODING'; value: string }
  | { type: 'INVALID_PANES_JSON' }
  | { type: 'INVALID_PANES_LAYOUT' }
  | { type: 'INVALID_PANES_CHILD_RATIO'; paneIndex: number; value: unknown };

export interface DecodedPaneLayout {
  layout: PaneLayout;
  source: 'LAYOUT' | 'PANES_JSON' | 'EMPTY';
}
