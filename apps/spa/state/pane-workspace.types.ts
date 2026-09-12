import type { PaneData } from './view.types';

export type PaneId = string;
export type PaneColumnId = string;
export type PaneTarget = PaneData;

export interface PaneInstance {
  id: PaneId;
  target: PaneTarget;
}

export interface PaneTile {
  paneId: PaneId;
  /** Relative height within its column. */
  weight: number;
  collapsed: boolean;
}

export interface PaneColumn {
  id: PaneColumnId;
  /** Relative width within the scrolling workspace. */
  width: number;
  collapsed: boolean;
  tiles: PaneTile[];
}

export interface TransientPane {
  paneId: PaneId;
  anchorPaneId: PaneId | null;
}

export interface PaneWorkspace {
  panes: Record<PaneId, PaneInstance>;
  columns: PaneColumn[];
  transient: TransientPane[];
  focusedPaneId: PaneId | null;
}

export interface ExistingColumnDestination {
  type: 'COLUMN';
  columnId: PaneColumnId;
  /** Index after the pane has been removed from its previous location. */
  index?: number;
  weight?: number;
}

export interface NewColumnDestination {
  type: 'NEW_COLUMN';
  columnId: PaneColumnId;
  /** Index after the pane's previous empty column has been removed. */
  index?: number;
  width?: number;
  weight?: number;
}

export interface TransientDestination {
  type: 'TRANSIENT';
  index?: number;
  anchorPaneId?: PaneId | null;
}

export type PaneDestination =
  ExistingColumnDestination | NewColumnDestination | TransientDestination;

export type PanePlacement =
  | { type: 'COLUMN'; columnId: PaneColumnId; columnIndex: number; tileIndex: number }
  | { type: 'TRANSIENT'; index: number };

export type PaneWorkspaceCommand =
  | { type: 'OPEN_PANE'; pane: PaneInstance; destination: PaneDestination }
  | { type: 'CLOSE_PANE'; paneId: PaneId }
  | { type: 'REPLACE_PANE'; paneId: PaneId; pane: PaneInstance }
  | { type: 'MOVE_PANE'; paneId: PaneId; destination: PaneDestination }
  | { type: 'MOVE_COLUMN'; columnId: PaneColumnId; index: number }
  | { type: 'SET_COLUMN_WIDTH'; columnId: PaneColumnId; width: number }
  | { type: 'SET_TILE_WEIGHT'; paneId: PaneId; weight: number }
  | { type: 'SET_COLUMN_COLLAPSED'; columnId: PaneColumnId; collapsed: boolean }
  | { type: 'SET_PANE_COLLAPSED'; paneId: PaneId; collapsed: boolean }
  | { type: 'FOCUS_PANE'; paneId: PaneId };

export type PaneWorkspaceError =
  | { type: 'INVALID_PANE_ID'; paneId: PaneId }
  | { type: 'INVALID_COLUMN_ID'; columnId: PaneColumnId }
  | { type: 'PANE_NOT_FOUND'; paneId: PaneId }
  | { type: 'PANE_NOT_TILED'; paneId: PaneId }
  | { type: 'COLUMN_NOT_FOUND'; columnId: PaneColumnId }
  | { type: 'PANE_ALREADY_EXISTS'; paneId: PaneId }
  | { type: 'COLUMN_ALREADY_EXISTS'; columnId: PaneColumnId }
  | {
      type: 'INVALID_INDEX';
      destination: PaneDestination['type'] | 'COLUMN_ORDER';
      index: number;
      max: number;
    }
  | { type: 'INVALID_SIZE'; field: 'COLUMN_WIDTH' | 'TILE_WEIGHT'; value: number }
  | { type: 'INVALID_ANCHOR'; paneId: PaneId; anchorPaneId: PaneId };

export type PaneWorkspaceInvariantError =
  | { type: 'INVALID_PANE_ID'; paneId: PaneId }
  | { type: 'INVALID_COLUMN_ID'; columnId: PaneColumnId }
  | { type: 'DUPLICATE_COLUMN_ID'; columnId: PaneColumnId }
  | { type: 'EMPTY_COLUMN'; columnId: PaneColumnId }
  | { type: 'INVALID_SIZE'; field: 'COLUMN_WIDTH' | 'TILE_WEIGHT'; value: number }
  | { type: 'PLACED_PANE_NOT_FOUND'; paneId: PaneId }
  | { type: 'PANE_PLACED_MULTIPLE_TIMES'; paneId: PaneId }
  | { type: 'UNPLACED_PANE'; paneId: PaneId }
  | { type: 'INVALID_ANCHOR'; paneId: PaneId; anchorPaneId: PaneId }
  | { type: 'MISSING_FOCUS' }
  | { type: 'INVALID_FOCUS'; paneId: PaneId };
