import { Err, Ok, type Result } from '@boluo/utils/result';
import { DEFAULT_PANE_COLUMN_WIDTH, DEFAULT_PANE_TILE_WEIGHT } from './pane-workspace';
import {
  emptyPaneLayout,
  parsePaneTarget,
  paneLayoutFromPanesJson,
  validatePaneLayout,
} from './pane-layout';
import type {
  DecodedPaneLayout,
  PaneLayout,
  PaneLayoutColumn,
  PaneLayoutError,
  PaneLayoutTile,
  PaneLayoutTransient,
} from './pane-layout.types';
import type { PaneTarget } from './pane-workspace.types';

const COLUMN_SEPARATOR = '!';
const TILE_SEPARATOR = '~';
const TRANSIENT_SEPARATOR = ',';
const ATTRIBUTE_SEPARATOR = '@';

export const encodePaneTarget = (
  target: PaneTarget,
  paneIndex: number,
  currentSpaceId?: string,
): Result<string, PaneLayoutError> => {
  const parsed = parsePaneTarget(target, paneIndex);
  if (parsed.isErr) return parsed;
  const validTarget = parsed.some;
  switch (validTarget.type) {
    case 'SPACE':
      return new Ok(
        validTarget.spaceId === currentSpaceId ? 'space' : `space.${validTarget.spaceId}`,
      );
    case 'CHANNEL':
      return new Ok(`channel.${validTarget.channelId}`);
    case 'CHARACTER':
      return new Ok(
        validTarget.spaceId === currentSpaceId
          ? `character.${validTarget.characterId}`
          : `character.${validTarget.spaceId}.${validTarget.characterId}`,
      );
    case 'EMPTY':
      return new Ok('empty');
    case 'SETTINGS':
      return new Ok('settings');
    case 'HELP':
      return new Ok('help');
    case 'WELCOME':
      return new Ok('welcome');
    case 'SPACE_SETTINGS':
      return new Ok(
        validTarget.spaceId === currentSpaceId
          ? 'space-settings'
          : `space-settings.${validTarget.spaceId}`,
      );
    case 'SPACE_GREETING':
      return new Ok(
        validTarget.spaceId === currentSpaceId
          ? 'space-greeting'
          : `space-greeting.${validTarget.spaceId}`,
      );
    case 'CREATE_CHANNEL':
      return new Ok(
        validTarget.spaceId === currentSpaceId
          ? 'create-channel'
          : `create-channel.${validTarget.spaceId}`,
      );
    case 'CREATE_SPACE':
      return new Ok('create-space');
    case 'LOGIN':
      return new Ok('login');
    case 'SIGN_UP':
      return new Ok('sign-up');
    case 'RESET_PASSWORD':
      return new Ok('reset-password');
    case 'PROFILE':
      return new Ok(`profile.${validTarget.userId}`);
    case 'SPACE_MEMBERS':
      return new Ok(
        validTarget.spaceId === currentSpaceId
          ? 'space-members'
          : `space-members.${validTarget.spaceId}`,
      );
    case 'CHANNEL_SETTINGS':
      return new Ok(`channel-settings.${validTarget.channelId}`);
    case 'CHANNEL_TOPIC':
      return new Ok(`channel-topic.${validTarget.channelId}`);
    case 'CHANNEL_EXPORT':
      return new Ok(`channel-export.${validTarget.channelId}`);
  }
};

export const decodePaneTarget = (
  value: string,
  paneIndex: number,
  currentSpaceId?: string,
): Result<PaneTarget, PaneLayoutError> => {
  const [code, ...args] = value.split('.');
  const parse = (target: unknown): Result<PaneTarget, PaneLayoutError> =>
    parsePaneTarget(target, paneIndex);
  switch (code) {
    case 'space': {
      if (args.length > 1) break;
      return parse({ type: 'SPACE', spaceId: args[0] ?? currentSpaceId });
    }
    case 'channel': {
      if (args.length !== 1) break;
      return parse({ type: 'CHANNEL', channelId: args[0] });
    }
    case 'character': {
      if (args.length < 1 || args.length > 2) break;
      return parse({
        type: 'CHARACTER',
        spaceId: args.length === 2 ? args[0] : currentSpaceId,
        characterId: args.at(-1),
      });
    }
    case 'empty':
      if (args.length === 0) return parse({ type: 'EMPTY' });
      break;
    case 'settings':
      if (args.length === 0) return parse({ type: 'SETTINGS' });
      break;
    case 'help':
      if (args.length === 0) return parse({ type: 'HELP' });
      break;
    case 'welcome':
      if (args.length === 0) return parse({ type: 'WELCOME' });
      break;
    case 'space-settings':
    case 'space-greeting':
    case 'create-channel':
    case 'space-members': {
      if (args.length > 1) break;
      const type = {
        'space-settings': 'SPACE_SETTINGS',
        'space-greeting': 'SPACE_GREETING',
        'create-channel': 'CREATE_CHANNEL',
        'space-members': 'SPACE_MEMBERS',
      }[code] as 'SPACE_SETTINGS' | 'SPACE_GREETING' | 'CREATE_CHANNEL' | 'SPACE_MEMBERS';
      return parse({ type, spaceId: args[0] ?? currentSpaceId });
    }
    case 'create-space':
      if (args.length === 0) return parse({ type: 'CREATE_SPACE' });
      break;
    case 'login':
      if (args.length === 0) return parse({ type: 'LOGIN' });
      break;
    case 'sign-up':
      if (args.length === 0) return parse({ type: 'SIGN_UP' });
      break;
    case 'reset-password':
      if (args.length === 0) return parse({ type: 'RESET_PASSWORD' });
      break;
    case 'profile': {
      if (args.length !== 1) break;
      return parse({ type: 'PROFILE', userId: args[0] });
    }
    case 'channel-settings':
    case 'channel-topic':
    case 'channel-export': {
      if (args.length !== 1) break;
      const type = {
        'channel-settings': 'CHANNEL_SETTINGS',
        'channel-topic': 'CHANNEL_TOPIC',
        'channel-export': 'CHANNEL_EXPORT',
      }[code] as 'CHANNEL_SETTINGS' | 'CHANNEL_TOPIC' | 'CHANNEL_EXPORT';
      return parse({ type, channelId: args[0] });
    }
  }
  return new Err({ type: 'INVALID_ENCODING', value });
};

const sizePattern = String.raw`(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?`;
const sizeAttributesPattern = new RegExp(
  String.raw`^(?:w(${sizePattern})|w\((${sizePattern})\))?$`,
  'i',
);

const encodeSize = (value: number): string => encodeURIComponent(String(value));

const encodeSizeAttributes = (size: number, defaultSize: number, collapsed: boolean): string => {
  if (collapsed) return `w(${encodeSize(size)})`;
  return size === defaultSize ? '' : `w${encodeSize(size)}`;
};

const encodeColumnFlags = (column: PaneLayoutColumn): string => {
  return encodeSizeAttributes(column.width, DEFAULT_PANE_COLUMN_WIDTH, column.collapsed);
};

const encodeTileFlags = (tile: PaneLayoutTile): string => {
  return encodeSizeAttributes(tile.weight, DEFAULT_PANE_TILE_WEIGHT, tile.collapsed);
};

const decodeFlags = (
  value: string,
  defaultSize: number,
): Result<{ size: number; collapsed: boolean }, PaneLayoutError> => {
  const match = sizeAttributesPattern.exec(value);
  if (!match) return new Err({ type: 'INVALID_ENCODING', value });
  const encodedSize = match[1] ?? match[2];
  const size = encodedSize == null ? defaultSize : Number(encodedSize);
  if (!Number.isFinite(size) || size <= 0) {
    return new Err({ type: 'INVALID_ENCODING', value });
  }
  return new Ok({ size, collapsed: match[2] != null });
};

export const encodePaneLayoutQuery = (
  layout: PaneLayout,
  currentSpaceId?: string,
): Result<string, PaneLayoutError> => {
  const validation = validatePaneLayout(layout);
  if (validation.isErr) return validation;
  let paneIndex = 0;
  const columns: string[] = [];
  for (const column of layout.columns) {
    const tiles: string[] = [];
    for (const tile of column.tiles) {
      const target = encodePaneTarget(tile.target, paneIndex, currentSpaceId);
      if (target.isErr) return target;
      const flags = encodeTileFlags(tile);
      tiles.push(`${target.some}${flags === '' ? '' : `${ATTRIBUTE_SEPARATOR}${flags}`}`);
      paneIndex++;
    }
    const flags = encodeColumnFlags(column);
    columns.push(`${flags === '' ? '' : `${flags}:`}${tiles.join(TILE_SEPARATOR)}`);
  }
  const transient: string[] = [];
  for (const pane of layout.transient) {
    const target = encodePaneTarget(pane.target, paneIndex, currentSpaceId);
    if (target.isErr) return target;
    transient.push(
      `${target.some}${
        pane.anchorIndex == null ? '' : `${ATTRIBUTE_SEPARATOR}a${pane.anchorIndex.toString(36)}`
      }`,
    );
    paneIndex++;
  }
  const params = [`layout=${columns.join(COLUMN_SEPARATOR)}`];
  if (transient.length > 0) {
    params.push(`transient=${transient.join(TRANSIENT_SEPARATOR)}`);
  }
  return new Ok(params.join('&'));
};

const splitAttributes = (value: string): [string, string] => {
  const separator = value.lastIndexOf(ATTRIBUTE_SEPARATOR);
  return separator === -1 ? [value, ''] : [value.slice(0, separator), value.slice(separator + 1)];
};

const decodePaneLayout = (
  params: URLSearchParams,
  currentSpaceId?: string,
): Result<PaneLayout, PaneLayoutError> => {
  const columns: PaneLayoutColumn[] = [];
  let paneIndex = 0;
  const encodedColumns = params.get('layout') ?? '';
  for (const encodedColumn of encodedColumns === '' ? [] : encodedColumns.split(COLUMN_SEPARATOR)) {
    const colon = encodedColumn.indexOf(':');
    const encodedColumnFlags = colon === -1 ? '' : encodedColumn.slice(0, colon);
    const encodedTiles = colon === -1 ? encodedColumn : encodedColumn.slice(colon + 1);
    const columnFlags = decodeFlags(encodedColumnFlags, DEFAULT_PANE_COLUMN_WIDTH);
    if (columnFlags.isErr) return columnFlags;
    if (encodedTiles === '') return new Err({ type: 'INVALID_ENCODING', value: encodedColumn });
    const tiles: PaneLayoutTile[] = [];
    for (const encodedTile of encodedTiles.split(TILE_SEPARATOR)) {
      const [encodedTarget, encodedFlags] = splitAttributes(encodedTile);
      const target = decodePaneTarget(encodedTarget, paneIndex, currentSpaceId);
      if (target.isErr) return target;
      const flags = decodeFlags(encodedFlags, DEFAULT_PANE_TILE_WEIGHT);
      if (flags.isErr) return flags;
      tiles.push({ target: target.some, weight: flags.some.size, collapsed: flags.some.collapsed });
      paneIndex++;
    }
    columns.push({
      width: columnFlags.some.size,
      collapsed: columnFlags.some.collapsed,
      tiles,
    });
  }

  const transient: PaneLayoutTransient[] = [];
  const encodedTransient = params.get('transient') ?? '';
  for (const encodedPane of encodedTransient === ''
    ? []
    : encodedTransient.split(TRANSIENT_SEPARATOR)) {
    const [encodedTarget, encodedFlags] = splitAttributes(encodedPane);
    const target = decodePaneTarget(encodedTarget, paneIndex, currentSpaceId);
    if (target.isErr) return target;
    if (encodedFlags !== '' && !/^a[0-9a-z]+$/.test(encodedFlags)) {
      return new Err({ type: 'INVALID_ENCODING', value: encodedPane });
    }
    const anchorIndex = encodedFlags === '' ? null : Number.parseInt(encodedFlags.slice(1), 36);
    transient.push({ target: target.some, anchorIndex });
    paneIndex++;
  }

  const layout = { columns, transient };
  const validation = validatePaneLayout(layout);
  return validation.isErr ? validation : new Ok(layout);
};

export const decodePaneLayoutQuery = (
  raw: string,
  currentSpaceId?: string,
): Result<DecodedPaneLayout, PaneLayoutError> => {
  const query = raw.startsWith('#') || raw.startsWith('?') ? raw.slice(1) : raw;
  const params = new URLSearchParams(query);
  if (params.has('layout') || params.has('transient')) {
    return decodePaneLayout(params, currentSpaceId).map((layout) => ({ layout, source: 'LAYOUT' }));
  }
  const panesJson = params.get('panes');
  if (panesJson == null || panesJson === '') {
    return new Ok({ layout: emptyPaneLayout(), source: 'EMPTY' });
  }
  return paneLayoutFromPanesJson(panesJson).map((layout) => ({ layout, source: 'PANES_JSON' }));
};
