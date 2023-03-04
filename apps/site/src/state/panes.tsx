import type { Channel } from 'api';
import { Dispatch, FC, useEffect, useMemo } from 'react';
import { useCallback } from 'react';
import { createContext, useContext, useReducer } from 'react';
import { makeId } from 'utils';
import type { ChildrenProps } from 'utils';
import { useChannelList } from '../hooks/useChannelList';
import { isPaneData, isSamePaneData, makePane, Pane, PaneData as PaneData } from '../types/chat-pane';
import { useChatDispatch } from './atoms/chat';

export interface AddPane {
  type: 'ADD_PANE';
  insertAfter?: string;
  item: Pane;
}

export interface TogglePane {
  type: 'TOGGLE';
  pane: Pane;
}

export interface ReplacePane {
  type: 'REPLACE_PANE';
  item: Pane;
}

export interface RemovePane {
  type: 'REMOVE_PANE';
  id: string;
}

export interface Focus {
  type: 'FOCUS';
  id: string;
}

export interface RouteChanged {
  type: 'ROUTE_CHANGED';
  paneDataList: PaneData[];
}

type Action = AddPane | ReplacePane | RemovePane | Focus | TogglePane | RouteChanged;

const PaneDispatchContext = createContext<Dispatch<Action>>(() => {
  throw new Error('Unexpected');
});

const PaneIdContext = createContext<string>('');

export const PaneIdProvider: FC<ChildrenProps & { id: string }> = ({ id, children }) => (
  <PaneIdContext.Provider value={id}>{children}</PaneIdContext.Provider>
);

const FocusPaneContext = createContext<string | null>('');

export const useIsFocused = (): boolean => {
  const id = usePaneId();
  return useContext(FocusPaneContext) === id;
};

export const usePaneId = (): string => {
  const id = useContext(PaneIdContext);
  if (id === '') {
    throw new Error('Unexpected. Attempt use pane id outside provider.');
  }
  return id;
};

export const useFocusPane = () => {
  const id = useContext(PaneIdContext);
  const dispatch = useChatPaneDispatch();
  return useCallback(() => dispatch({ type: 'FOCUS', id }), [dispatch, id]);
};

export const useClosePane = () => {
  const id = usePaneId();
  const dispatch = useChatPaneDispatch();
  return useCallback(() => dispatch({ type: 'REMOVE_PANE', id }), [dispatch, id]);
};

interface PaneProviderProps extends ChildrenProps {
  dispatch: Dispatch<Action>;
  focused: string | null;
}

export const PaneProvider: FC<PaneProviderProps> = ({ children, dispatch, focused }) => {
  return (
    <PaneDispatchContext.Provider value={dispatch}>
      <FocusPaneContext.Provider value={focused}>{children}</FocusPaneContext.Provider>
    </PaneDispatchContext.Provider>
  );
};

export const useChatPaneDispatch = (): Dispatch<Action> => useContext(PaneDispatchContext);

interface Return {
  dispatch: Dispatch<Action>;
  panes: Pane[];
  focused: string | null;
}

interface PaneState {
  focused: string | null;
  panes: Pane[];
}

const handleAddChat = (state: PaneState, { insertAfter, item }: AddPane): PaneState => {
  const panes = [...state.panes];
  if (insertAfter === undefined) {
    panes.unshift(item);
  } else {
    const index = panes.findIndex(pane => pane.id === insertAfter);
    if (index >= 0) {
      panes.splice(index + 1, 0, item);
    } else {
      panes.unshift(item);
    }
  }
  return { ...state, panes, focused: item.id };
};

const handleReplacePane = (state: PaneState, action: ReplacePane): PaneState => {
  const { focused } = state;
  if (!focused || state.panes.length <= 1) {
    return { ...state, panes: [action.item], focused: action.item.id };
  }
  const panes = [...state.panes];
  const focusedPaneIndex = panes.findIndex(pane => pane.id === focused);
  if (focusedPaneIndex >= 0) {
    panes[focusedPaneIndex] = action.item;
  } else {
    panes.push(action.item);
  }
  return { ...state, panes, focused: action.item.id };
};

const handleRemovePane = (state: PaneState, action: RemovePane): PaneState => {
  let { panes, focused } = state;
  panes = panes.filter(item => item.id !== action.id);
  if (focused === action.id && panes.length > 0) {
    const index = state.panes.findIndex(pane => pane.id === focused);
    if (index > 0) {
      focused = state.panes[index - 1]!.id;
    } else {
      focused = panes[0]!.id;
    }
  }
  return { ...state, panes, focused };
};

const handleTogglePane = (state: PaneState, action: TogglePane): PaneState => {
  const settingsPaneIndex = state.panes.findIndex((pane) =>
    pane.type === action.pane.type && pane.id === action.pane.id
  );
  if (settingsPaneIndex === -1) {
    const panes: typeof state.panes = [action.pane].concat(state.panes);
    return { ...state, panes, focused: action.pane.id };
  } else {
    return handleRemovePane(state, { type: 'REMOVE_PANE', id: action.pane.id });
  }
};

const handleFocus = (state: PaneState, { id }: Focus): PaneState => {
  const { panes, focused } = state;
  if (id === '') {
    if (panes.length > 0) {
      return { ...state, focused: panes[0]!.id };
    } else {
      return { ...state, focused: null };
    }
  }
  if (focused === id) {
    return state;
  }
  return { panes, focused: id };
};

const handleRouteChanged = (state: PaneState, { paneDataList }: RouteChanged): PaneState => {
  const length = Math.min(state.panes.length, paneDataList.length);
  const panes = [];
  let changed = false;
  for (let i = 0; i < length; i += 1) {
    const paneData = paneDataList[i]!;
    const pane = state.panes[i]!;
    if (isSamePaneData(paneData, pane)) {
      panes.push(pane);
    } else {
      changed = true;
      panes.push(makePane(paneData));
    }
  }
  if (state.panes.length !== paneDataList.length) {
    changed = true;
    panes.push(...paneDataList.slice(length).map(makePane));
  }
  if (!changed) {
    return state;
  }
  let { focused } = state;
  if (panes.length === 0) {
    focused = null;
  } else if (!panes.some(pane => pane.id === focused)) {
    focused = panes[0]!.id;
  }
  return { ...state, focused, panes };
};

const parsePaneDataList = (hash: string): PaneData[] | null => {
  try {
    const panes: unknown = JSON.parse(decodeURIComponent(hash.slice(1)));
    if (Array.isArray(panes) && panes.every(isPaneData)) {
      return panes;
    }
  } catch (e) {
  }
  return null;
};

const panesToPaneDataList = (panes: Pane[]): PaneData[] => {
  return panes.filter(pane => pane.type !== 'EMPTY').map(pane => ({ ...pane, id: undefined }));
};

const initPaneState = (channels: Channel[]): PaneState => {
  const hash = window.location.hash;
  if (hash) {
    const paneDataList = parsePaneDataList(hash);
    if (paneDataList) {
      return { focused: null, panes: paneDataList.map(makePane) };
    }
  }
  const channel = channels.find(channel => channel.isPublic);
  if (!channel) {
    return { focused: null, panes: [] };
  }

  const id = makeId();
  const panes: Pane[] = [{ type: 'CHANNEL', id, channelId: channel.id }];
  return { focused: id, panes };
};

export const usePanes = (spaceId: string): Return => {
  const chatDispatch = useChatDispatch();
  const channels = useChannelList(spaceId);
  const reducer = (state: PaneState, action: Action): PaneState => {
    switch (action.type) {
      case 'FOCUS':
        return handleFocus(state, action);
      case 'ADD_PANE':
        return handleAddChat(state, action);
      case 'REMOVE_PANE':
        return handleRemovePane(state, action);
      case 'REPLACE_PANE':
        return handleReplacePane(state, action);
      case 'TOGGLE':
        return handleTogglePane(state, action);
      case 'ROUTE_CHANGED':
        return handleRouteChanged(state, action);
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, channels, initPaneState);
  const { panes, focused } = state;
  const hash = useMemo(() => encodeURIComponent(JSON.stringify(panesToPaneDataList(panes))), [panes]);

  useEffect(() => {
    window.location.hash = hash;
    const listener = (e: HashChangeEvent) => {
      const newUrl = new URL(e.newURL);
      const newHash = newUrl.hash;
      if (newHash !== '#' + hash) {
        const paneDataList = parsePaneDataList(newHash);
        if (paneDataList) {
          dispatch({ type: 'ROUTE_CHANGED', paneDataList });
        }
      }
    };
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, [hash]);

  useEffect(() => chatDispatch('enterSpace', { spaceId }), [chatDispatch, spaceId]);

  useEffect(() => {
    const channelIdSet = new Set(panes.flatMap(pane => (pane.type === 'CHANNEL' ? [pane.channelId] : [])));
    chatDispatch('panesChange', { channelIdSet });
  }, [panes, chatDispatch]);
  return { panes: panes, dispatch, focused };
};
