import type { Channel } from 'boluo-api';
import { makeId } from 'boluo-utils';
import type { Dispatch, FC } from 'react';
import { useCallback } from 'react';
import { createContext, useContext, useReducer } from 'react';
import type { ChildrenProps } from '../helper/props';
import { useChannelList } from '../hooks/useChannelList';
import type { Pane } from '../types/ChatPane';

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

type Action = AddPane | ReplacePane | RemovePane | Focus | TogglePane;

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

const initPaneState = (channels: Channel[]) => {
  const channel = channels.find(channel => channel.isPublic);
  if (!channel) {
    return { focused: null, panes: [] };
  }

  const id = makeId();
  const panes: Pane[] = [{ type: 'CHANNEL', id, channelId: channel.id }];
  return { focused: id, panes };
};

export const usePanes = (spaceId: string): Return => {
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
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, channels, initPaneState);
  const { panes, focused } = state;
  return { panes: panes, dispatch, focused };
};
