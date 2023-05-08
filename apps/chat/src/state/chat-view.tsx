import { createContext, Dispatch, FC, useCallback, useContext, useEffect, useReducer } from 'react';
import { isUuid } from 'utils';
import type { ChildrenProps } from 'utils';
import { isPaneData, isSamePaneData, makePane, Pane, PaneData as PaneData } from '../types/chat-pane';
import { useChatDispatch } from './chat.atoms';

interface RootRoute {
  type: 'ROOT';
}

interface SpaceRoute {
  type: 'SPACE';
  spaceId: string;
}

interface NotFoundRoute {
  type: 'NOT_FOUND';
}

export type ChatRoute = RootRoute | SpaceRoute | NotFoundRoute;

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

export interface HashChanged {
  type: 'HASH_CHANGED';
  hash: string;
}

type Action = AddPane | ReplacePane | RemovePane | Focus | TogglePane | HashChanged;

const PaneDispatchContext = createContext<Dispatch<Action>>(() => {
  throw new Error('Unexpected');
});

const PaneIdContext = createContext<string>('');

export const PaneIdProvider: FC<ChildrenProps & { id: string }> = ({ id, children }) => (
  <PaneIdContext.Provider value={id}>{children}</PaneIdContext.Provider>
);

export const FocusPaneContext = createContext<string | null>(null);

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

interface UseChatViewStateReturn {
  dispatch: Dispatch<Action>;
  panes: Pane[];
  route: ChatRoute;
  focused: string | null;
}

export interface ChatViewState {
  hash: string;
  route: ChatRoute;
  focused: string | null;
  panes: Pane[];
}

const handleAddChat = (state: ChatViewState, { insertAfter, item }: AddPane): ChatViewState => {
  const panes = [...state.panes];
  const alreadyExists = panes.find(pane => pane.type === item.type && pane.id === item.id);
  if (alreadyExists) {
    return { ...state, focused: alreadyExists.id };
  }
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

const handleReplacePane = (state: ChatViewState, action: ReplacePane): ChatViewState => {
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

const handleRemovePane = (state: ChatViewState, action: RemovePane): ChatViewState => {
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

const handleTogglePane = (state: ChatViewState, action: TogglePane): ChatViewState => {
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

const handleFocus = (state: ChatViewState, { id }: Focus): ChatViewState => {
  const { panes, focused, ...rest } = state;
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
  return { ...rest, panes, focused: id };
};

const handleHashChanged = (state: ChatViewState, { hash }: HashChanged): ChatViewState => {
  if (hash === state.hash) {
    return state;
  }
  const newRoute = parseSerializedState(hash);
  if (!newRoute) {
    return state;
  }
  const { paneDataList, route } = newRoute;
  if (route.type !== 'SPACE') {
    return { route, hash, focused: null, panes: [] };
  }
  if (route.type !== state.route.type || route.spaceId !== state.route.spaceId) {
    const panes = paneDataList.map(makePane);
    return { route, hash, focused: panes.length === 0 ? null : panes[0]!.id, panes };
  }
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
  return { ...state, hash, focused, panes };
};

const parsePaneDataList = (raw: string): PaneData[] | null => {
  try {
    const panes: unknown = JSON.parse(decodeURIComponent(raw));
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

const initPaneState = (hash: string): ChatViewState => {
  const serilizedPaneState = parseSerializedState(hash);
  if (!serilizedPaneState) {
    return { route: { type: 'ROOT' }, hash, focused: null, panes: [] };
  }
  const { route, paneDataList } = serilizedPaneState;
  const panes = paneDataList.map(makePane);
  return { focused: panes.length > 0 ? panes[0]!.id : null, panes, route, hash };
};

interface SerializedPaneState {
  route: ChatRoute;
  paneDataList: PaneData[];
}

const SPACE_ID_PART_REGEX = /^([a-zA-Z0-9\-]+)\/?/;

const parseSerializedState = (raw: string): SerializedPaneState => {
  const matchSpaceId = SPACE_ID_PART_REGEX.exec(raw);
  if (!matchSpaceId) {
    return { route: { type: 'ROOT' }, paneDataList: [] };
  }
  const spaceId = matchSpaceId[1];
  if (!isUuid(spaceId)) {
    console.log('Invalid space id', spaceId);
    return { route: { type: 'NOT_FOUND' }, paneDataList: [] };
  }
  const rest = raw.slice(matchSpaceId[0].length);
  const paneDataList = parsePaneDataList(rest) ?? [];
  return { route: { type: 'SPACE', spaceId }, paneDataList };
};

const getHash = (): string => {
  return window.location.hash.slice(1);
};

export const useChatViewState = (): UseChatViewStateReturn => {
  const chatDispatch = useChatDispatch();

  const reducer = (state: ChatViewState, action: Action): ChatViewState => {
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
      case 'HASH_CHANGED':
        return handleHashChanged(state, action);
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, getHash(), initPaneState);
  const { panes, focused, route } = state;

  useEffect(() => {
    if (route.type === 'SPACE') {
      chatDispatch('enterSpace', { spaceId: route.spaceId });
    }
  }, [chatDispatch, route]);

  useEffect(() => {
    if (route.type === 'SPACE') {
      let panesPart = '';
      if (panes.length > 0) {
        panesPart = '/' + encodeURIComponent(JSON.stringify(panesToPaneDataList(panes)));
      }
      const newHash = `${route.spaceId}${panesPart}`;
      window.location.hash = newHash;
    }
    const listener = (e: HashChangeEvent) => {
      const hash = getHash();
      dispatch({ type: 'HASH_CHANGED', hash });
    };
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, [panes, route]);

  useEffect(() => {
    const channelIdSet = new Set(panes.flatMap(pane => (pane.type === 'CHANNEL' ? [pane.channelId] : [])));
    chatDispatch('panesChange', { channelIdSet });
  }, [panes, chatDispatch]);
  return { route, panes, dispatch, focused };
};
