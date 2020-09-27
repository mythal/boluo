import { Message } from '../api/messages';
import { ChannelEvent } from '../api/events';
import { Id } from '../utils/id';
import { Dispatch } from '../store';
import { get } from '../api/request';
import { throwErr } from '../utils/errors';
import { connect as apiConnect } from '../api/connect';
import { ChatState } from '../reducers/chat';
import { List, Map } from 'immutable';
import { initialChatItemSet, MessageItem, PreviewItem } from '../states/chat-item-set';
import { showFlash } from './flash';
import { batch } from 'react-redux';

export interface CloseChat {
  type: 'CLOSE_CHAT';
  pane: number;
  id: Id;
}

export interface LoadMessages {
  type: 'LOAD_MESSAGES';
  messages: Message[];
  finished: boolean;
  pane: number;
}

export interface ChannelEventReceived {
  type: 'CHANNEL_EVENT_RECEIVED';
  event: ChannelEvent;
  pane: number;
}

export interface ChatLoaded {
  type: 'CHAT_LOADED';
  chat: ChatState;
  pane: number;
}

export interface ChatUpdate {
  type: 'CHAT_UPDATE';
  id: Id;
  chat: Partial<ChatState>;
  pane: number;
}

const initialRetry = 500;
const maxRetry = 8000;
let retry = initialRetry;
let retryTimestamp = new Date().getTime();

function connect(dispatch: Dispatch, id: Id, eventAfter: number, pane: number): WebSocket {
  const connection = apiConnect(id, 'CHANNEL', eventAfter);
  connection.onmessage = (wsMsg) => {
    const event = JSON.parse(wsMsg.data) as ChannelEvent;
    retryTimestamp = event.timestamp;
    dispatch({ type: 'CHANNEL_EVENT_RECEIVED', event, pane });
  };
  connection.onopen = () => {
    if (retry !== initialRetry) {
      dispatch(showFlash('SUCCESS', '已重新连接上频道'));
    }
    retry = initialRetry;
  };
  connection.onerror = (e) => {
    console.warn(e);
  };
  connection.onclose = (e) => {
    console.warn(e);
    dispatch(showFlash('ERROR', `连接出现错误，${retry / 1000} 秒后尝试重新连接`));
    setTimeout(() => {
      retry *= 2;
      if (retry > maxRetry) {
        retry = maxRetry;
      }
      dispatch({ type: 'CHAT_UPDATE', id, chat: { connection: connect(dispatch, id, retryTimestamp, pane) }, pane });
    }, retry);
  };
  return connection;
}

export const loadChat = (id: Id, pane: number) => async (dispatch: Dispatch) => {
  const result = await get('/channels/query_with_related', { id });
  if (result.isErr) {
    throwErr(dispatch)(result.value);
    return;
  }
  const { channel, members, colorList, heartbeatMap, encodedEvents } = result.value;
  const initialEvents: ChannelEvent[] = encodedEvents.map((encoded) => JSON.parse(encoded));
  const now = new Date().getTime();
  const eventAfter = initialEvents.length > 0 ? Math.max(...initialEvents.map((event) => event.timestamp)) : now;
  const messageBefore = now;
  const connection = connect(dispatch, channel.id, eventAfter, pane);
  const chat: ChatState = {
    colorMap: Map<Id, string>(Object.entries(colorList)),
    itemSet: initialChatItemSet,
    messageBefore,
    eventAfter,
    finished: false,
    heartbeatMap: Map(heartbeatMap),
    channel,
    connection,
    members,
    filter: 'NONE',
    moving: false,
    showFolded: false,
    postponed: List(),
    pane,
  };
  batch(() => {
    dispatch({ type: 'CHAT_LOADED', chat, initialEvents: [], pane });
    for (const event of initialEvents) {
      dispatch<ChannelEventReceived>({ type: 'CHANNEL_EVENT_RECEIVED', event, pane });
    }
  });
};

export interface ChatFilter {
  type: 'CHAT_FILTER';
  pane: number;
  filter: ChatState['filter'];
}

export const chatNoneFilter = (pane: number): ChatFilter => ({ type: 'CHAT_FILTER', filter: 'NONE', pane });

export const chatInGameFilter = (pane: number): ChatFilter => ({ type: 'CHAT_FILTER', filter: 'IN_GAME', pane });

export const chatOutGameFilter = (pane: number): ChatFilter => ({ type: 'CHAT_FILTER', filter: 'OUT_GAME', pane });

export interface ToggleShowFolded {
  type: 'TOGGLE_SHOW_FOLDED';
}

export interface StartEditMessage {
  type: 'START_EDIT_MESSAGE';
  message: Message;
  pane: number;
}

export interface StopEditMessage {
  type: 'STOP_EDIT_MESSAGE';
  messageId: Id;
  pane: number;
  editFor: number;
}

export interface StartMoveMessage {
  type: 'START_MOVE_MESSAGE';
  pane: number;
}

export interface FinishMoveMessage {
  type: 'FINISH_MOVE_MESSAGE';
  pane: number;
}

export interface MovingMessage {
  type: 'MOVING_MESSAGE';
  message: MessageItem;
  targetItem: MessageItem | PreviewItem | undefined;
  pane: number;
}

export interface RevealMessage {
  type: 'REVEAL_MESSAGE';
  message: Message;
}

export interface ResetMessageMoving {
  type: 'RESET_MESSAGE_MOVING';
  messageId: Id;
  pane: number;
}

export interface SwitchActivePane {
  type: 'SWITCH_ACTIVE_PANE';
  pane: number;
}

export interface SplitPane {
  type: 'SPLIT_PANE';
  split: boolean;
}
