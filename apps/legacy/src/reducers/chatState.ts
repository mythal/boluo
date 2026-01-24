import { List, type Map } from 'immutable';
import * as O from 'optics-ts';
import {
  type Action,
  type AddDice,
  type CancelEdit,
  type ChatLoaded,
  type ChatUpdate,
  type ComposeEditFailed,
  type ComposeSendFailed,
  type LoadMessages,
  type MovingMessage,
  type ResetComposeAfterSent,
  type ResetMessageMoving,
  type RestoreComposeState,
  type SetBroadcast,
  type SetComposeMedia,
  type SetComposeSource,
  type SetInGame,
  type SetInputName,
  type SetIsAction,
  type SetWhisperTo,
  type StartEditMessage,
} from '../actions';
import { type Channel, makeMembers, type MemberWithUser } from '../api/channels';
import {
  compareEvents,
  type EditPreview,
  type EventId,
  eventIdMax,
  type Events,
  type PreviewDiff,
  type Preview,
  shouldAdvanceCursor,
} from '../api/events';
import { type Message } from '../api/messages';
import { type SpaceWithRelated } from '../api/spaces';
import { type Entity } from '../interpreter/entities';
import { parse } from '../interpreter/parser';
import {
  addItem,
  binarySearchPos,
  type ChatItem,
  type ChatItemSet,
  type PreviewItem,
  type PreviewKeyframe,
  deleteMessage,
  editMessage,
  makeMessageItem,
  markMessageMoving,
  resetMovingMessage,
} from '../states/chat-item-set';
import { type Id, newId } from '../utils/id';
import { type PreviewDiffOp } from '@boluo/types/bindings';

export interface UserItem {
  label: string;
  value: string;
}

export interface Compose {
  initialized: boolean;
  inputName: string;
  isAction: boolean;
  entities: Entity[];
  sending: boolean;
  edit: EditPreview | null;
  messageId: Id;
  media: File | string | undefined;
  source: string;
  whisperTo: UserItem[] | null | undefined;
  inGame: boolean;
  broadcast: boolean;
}

export interface ChatState {
  channel: Channel;
  members: MemberWithUser[];
  colorMap: Map<Id, string>;
  initialized: boolean;
  itemSet: ChatItemSet;
  finished: boolean;
  eventAfter: EventId;
  lastLoadBefore: number;
  filter: 'IN_GAME' | 'OUT_GAME' | 'NONE';
  showFolded: boolean;
  moving: boolean;
  postponed: List<Action>;
  compose: Compose;
}

const focusItemSet = O.optic<ChatState>().prop('itemSet');

const loadChat = (prevState: ChatState | undefined, { chat }: ChatLoaded): ChatState => {
  if (prevState?.channel.id === chat.channel.id) {
    // reload
    const { channel, members, colorMap } = chat;
    return { ...prevState, channel, members, colorMap };
  }
  return chat;
};

const updateChat = (state: ChatState, { id, chat }: ChatUpdate): ChatState => {
  if (id !== state.channel.id) {
    return state;
  }
  return { ...state, ...chat };
};

export const closeChat = (state: ChatState, channelId: Id): ChatState | undefined => {
  if (channelId !== state.channel.id) {
    return state;
  }
  return undefined;
};

const loadMessages = (
  chat: ChatState,
  { messages, finished }: LoadMessages,
  myId: Id | undefined,
): ChatState => {
  const len = messages.length;
  if (len === 0) {
    return { ...chat, finished };
  }
  const makeItem = makeMessageItem(myId);
  const top = chat.itemSet.messages.first();
  if (top && messages[0].pos >= top.pos) {
    throw new Error('Incorrect messages order');
  }
  messages.sort((a, b) => {
    return b.pos - a.pos;
  });
  messages = messages.reverse();
  const itemSet: ChatItemSet = {
    ...chat.itemSet,
    messages: chat.itemSet.messages.unshift(...messages.map(makeItem)),
  };
  return { ...chat, finished, itemSet };
};

const handleEditMessage = (
  chatState: ChatState,
  message: Message,
  myId: Id | undefined,
): ChatState => {
  const item = makeMessageItem(myId)(message);
  const itemSet = editMessage(chatState.itemSet, item, chatState.finished);
  return { ...chatState, itemSet };
};

const handleMessageDelete = (itemSet: ChatItemSet, messageId: Id): ChatItemSet => {
  return deleteMessage(itemSet, messageId);
};

const toPreviewKeyframe = (preview: Preview): PreviewKeyframe => ({
  id: preview.id,
  version: preview.v ?? 0,
  name: preview.name,
  text: preview.text ?? null,
  entities: preview.entities,
});

const applyPreviewDiffOps = (
  keyframe: PreviewKeyframe,
  ops: PreviewDiffOp[],
): { text: string | null; name: string; textChanged: boolean } | null => {
  const baseText = keyframe.text;
  let nextText = baseText ?? '';
  let textChanged = false;
  let name = keyframe.name;
  for (const op of ops) {
    switch (op.type) {
      case 'SPLICE': {
        const start = op.i;
        const deleteCount = op.len;
        if (
          !Number.isFinite(start) ||
          !Number.isFinite(deleteCount) ||
          start < 0 ||
          deleteCount < 0
        ) {
          return null;
        }
        const deleteEnd = start + deleteCount;
        if (start > nextText.length || deleteEnd > nextText.length) {
          return null;
        }
        nextText = nextText.slice(0, start) + op._ + nextText.slice(deleteEnd);
        textChanged = true;
        break;
      }
      case 'A':
        nextText += op._;
        textChanged = true;
        break;
      case 'NAME':
        name = op.name;
        break;
    }
  }
  if (textChanged && baseText == null) {
    return null;
  }
  return { text: textChanged ? nextText : baseText, name, textChanged };
};

const parsePreviewDiffEntities = (text: string, fallback: Entity[]): Entity[] => {
  try {
    return parse(text).entities;
  } catch (error) {
    console.warn('Failed to parse preview diff text', { text, error });
    return fallback;
  }
};

const applyPreviewDiff = (itemSet: ChatItemSet, diff: PreviewDiff): ChatItemSet => {
  const previewItem = itemSet.previews.get(diff.sender);
  if (!previewItem) return itemSet;
  const keyframe = previewItem.keyframe ?? toPreviewKeyframe(previewItem.preview);
  const payload = diff._;
  if (payload.id !== keyframe.id || payload.ref !== keyframe.version) {
    return itemSet;
  }
  const currentVersion = previewItem.preview.v ?? keyframe.version;
  if (payload.v != null && payload.v <= currentVersion) {
    return itemSet;
  }
  const result = applyPreviewDiffOps(keyframe, payload.op);
  if (!result) return itemSet;
  const { text, name } = result;
  let entities = keyframe.entities;
  if (payload.xs != null && payload.xs.length > 0) {
    entities = payload.xs;
  } else if (text != null) {
    entities = parsePreviewDiffEntities(text, keyframe.entities);
  }
  const preview: Preview = {
    ...previewItem.preview,
    name,
    text,
    entities,
    v: payload.v ?? previewItem.preview.v ?? keyframe.version,
  };
  const nextPreviewItem: PreviewItem = {
    ...previewItem,
    preview,
    keyframe,
  };
  return addItem(itemSet, nextPreviewItem);
};

const newPreview = (itemSet: ChatItemSet, preview: Preview, myId: Id | undefined): ChatItemSet => {
  const item: ChatItem = {
    type: 'PREVIEW',
    id: preview.senderId,
    mine: preview.senderId === myId,
    pos: preview.pos,
    preview,
    keyframe: toPreviewKeyframe(preview),
  };
  return addItem(itemSet, item);
};

const newMessage = (itemSet: ChatItemSet, message: Message, myId: Id | undefined): ChatItemSet => {
  return addItem(itemSet, makeMessageItem(myId)(message));
};

const handleStartEditMessage = (state: ChatState, { message }: StartEditMessage): ChatState => {
  let whisperTo: Compose['whisperTo'] = null;
  if (message.whisperToUsers) {
    // FIXME: fetch user name.
    whisperTo = message.whisperToUsers.map((user) => ({ label: user, value: user }));
  }
  const compose: Compose = {
    ...state.compose,
    messageId: message.id,
    edit: { time: message.modified, p: message.posP, q: message.posQ },
    isAction: message.isAction ?? false,
    inputName: message.inGame ? message.name : '',
    inGame: message.inGame ?? false,
    media: message.mediaId ?? undefined,
    source: message.text,
    whisperTo,
  };

  return { ...state, compose };
};

const handleMessageMoving = (
  state: ChatState,
  { message, targetItem }: MovingMessage,
): ChatState => {
  return O.modify(focusItemSet)((itemSet) => markMessageMoving(itemSet, message, targetItem))(
    state,
  );
};

const handleResetMessageMoving = (
  state: ChatState,
  { messageId }: ResetMessageMoving,
): ChatState => {
  const itemSet = resetMovingMessage(state.itemSet, messageId);
  return { ...state, itemSet };
};

const updateColorMap = (members: MemberWithUser[], colorMap: Map<Id, string>): Map<Id, string> => {
  for (const member of members) {
    const { textColor, userId } = member.channel;
    if (textColor !== colorMap.get(userId, null)) {
      if (textColor) {
        colorMap = colorMap.set(userId, textColor);
      } else {
        colorMap = colorMap.remove(userId);
      }
    }
  }
  return colorMap;
};

const ACTION_COMMAND = /^[.。]me\s*/;

const handleSetComposeSource = (state: ChatState, { source }: SetComposeSource): ChatState => {
  let { messageId } = state.compose;
  const prevSource = state.compose.source;
  const isAction = ACTION_COMMAND.test(source);
  if (!state.compose.edit) {
    if (prevSource.trim() === '' && source.trim() !== '') {
      messageId = newId();
    }
  }
  return { ...state, compose: { ...state.compose, source, messageId, isAction } };
};

const handleSetIsAction = (state: ChatState, action: SetIsAction): ChatState => {
  const oldIsAction = state.compose.isAction;
  let source = state.compose.source;
  let isAction: boolean;
  if (action.isAction === 'TOGGLE') {
    isAction = !oldIsAction;
  } else {
    isAction = action.isAction;
  }
  const match = source.match(ACTION_COMMAND);
  if (isAction && !match) {
    // add ".me" to source
    source = `.me ${source}`;
  } else if (!isAction && match) {
    // remove ".me" from source
    source = source.substring(match[0].length);
  }
  return { ...state, compose: { ...state.compose, isAction, source } };
};

const handleSetBroadcast = (state: ChatState, action: SetBroadcast): ChatState => {
  const oldBroadcast = state.compose.broadcast;
  let broadcast: boolean;
  if (action.broadcast === 'TOGGLE') {
    broadcast = !oldBroadcast;
  } else {
    broadcast = action.broadcast;
  }
  let { messageId } = state.compose;
  if (!broadcast && !state.compose.edit) {
    messageId = newId();
  }
  return { ...state, compose: { ...state.compose, broadcast, messageId } };
};

const handleSetInGame = (state: ChatState, action: SetInGame): ChatState => {
  const oldInGame = state.compose.inGame;
  let inGame: boolean;
  if (action.inGame === 'TOGGLE') {
    inGame = !oldInGame;
  } else {
    inGame = action.inGame;
  }
  return { ...state, compose: { ...state.compose, inGame } };
};

const handleSetInputName = (state: ChatState, { name }: SetInputName): ChatState => {
  return { ...state, compose: { ...state.compose, inputName: name.trim() } };
};

const handleAddDice = (state: ChatState, { dice }: AddDice): ChatState => {
  const source = `${state.compose.source} {${dice}}`;
  return { ...state, compose: { ...state.compose, source } };
};

const handleSetComposeMedia = (state: ChatState, { media }: SetComposeMedia): ChatState => {
  return { ...state, compose: { ...state.compose, media } };
};

const handleSetWhisperTo = (state: ChatState, { whisperTo }: SetWhisperTo): ChatState => {
  return { ...state, compose: { ...state.compose, whisperTo } };
};

const handleChatInitialized = (
  myId: Id,
  channelId: Id,
  itemSet: ChatItemSet,
  myMember: MemberWithUser | undefined,
): Compose => {
  const item = itemSet.previews.get(myId);
  const compose: Compose = {
    messageId: newId(),
    initialized: true,
    inputName: '',
    entities: [],
    sending: false,
    edit: null,
    media: undefined,
    source: '',
    whisperTo: undefined,
    inGame: true,
    broadcast: true,
    isAction: false,
  };
  if (!item) {
    return compose;
  }
  const { preview } = item;
  if (preview.text === '' || preview.text == null || preview.channelId !== channelId) {
    return compose;
  }
  if (preview.edit) {
    compose.messageId = preview.id;
    compose.edit = preview.edit;
  }
  compose.source = preview.text;
  compose.inGame = preview.inGame ?? false;
  if (
    compose.inGame &&
    preview.name &&
    myMember &&
    preview.name !== myMember.channel.characterName
  ) {
    compose.inputName = preview.name;
  }
  return compose;
};

const handleComposeEditFailed = (state: ChatState, action: ComposeEditFailed): ChatState => {
  return state;
};

const handleComposeSendFailed = (state: ChatState, action: ComposeSendFailed): ChatState => {
  return state;
};

const handleResetComposeAfterSent = (
  state: ChatState,
  action: ResetComposeAfterSent,
): ChatState => {
  const compose: Compose = {
    ...state.compose,
    edit: null,
    sending: false,
    isAction: false,
    source: '',
    media: undefined,
  };
  return { ...state, compose };
};

const handleCancelEdit = (state: ChatState, action: CancelEdit): ChatState => {
  const compose: Compose = {
    ...state.compose,
    edit: null,
    messageId: newId(),
    source: '',
    inputName: '',
    media: undefined,
    whisperTo: null,
  };
  return { ...state, compose };
};

const handleComposeRestore = (state: ChatState, { compose }: RestoreComposeState): ChatState => {
  return { ...state, compose: { ...compose, messageId: newId() } };
};

const handleChannelEvent = (chat: ChatState, event: Events, myId: Id | undefined): ChatState => {
  const body = event.body;
  let { itemSet, channel, colorMap, members, eventAfter, initialized, compose } = chat;
  const advanceCursor = shouldAdvanceCursor(event);
  if (advanceCursor && compareEvents(event.id, eventAfter) <= 0) {
    return chat;
  }
  if ('channelId' in body && body.channelId !== channel.id) {
    return chat;
  }
  switch (body.type) {
    case 'NEW_MESSAGE':
      itemSet = newMessage(itemSet, body.message, myId);
      break;
    case 'MESSAGE_PREVIEW':
      if (chat.compose.messageId === body.preview.id && !body.preview.edit) {
        const itemIndexByPos = binarySearchPos(itemSet.messages, body.preview.pos);
        const itemByPos = itemSet.messages.get(itemIndexByPos);
        if (itemByPos && itemByPos.pos === body.preview.pos && itemByPos.type !== 'PREVIEW') {
          // Collision occurred, generate a new preview id.
          compose = { ...compose, messageId: newId() };
          break;
        }
      }
      itemSet = newPreview(itemSet, body.preview, myId);
      break;
    case 'DIFF':
      itemSet = applyPreviewDiff(itemSet, body.diff);
      break;
    case 'MESSAGE_DELETED':
      itemSet = handleMessageDelete(itemSet, body.messageId);
      break;
    case 'MESSAGE_EDITED':
      chat = handleEditMessage(chat, body.message, myId);
      return {
        ...chat,
        eventAfter: advanceCursor ? eventIdMax(eventAfter, event.id) : eventAfter,
      };
    case 'CHANNEL_EDITED':
      channel = body.channel;
      break;
    case 'MEMBERS':
      members = body.members;
      colorMap = updateColorMap(members, colorMap);
      break;
    case 'INITIALIZED':
      if (!initialized) {
        initialized = true;
        if (myId) {
          const myMember = members.find((member) => member.channel.userId === myId);
          compose = handleChatInitialized(myId, channel.id, itemSet, myMember);
        }
      }
      break;
  }
  if (advanceCursor) {
    eventAfter = eventIdMax(eventAfter, event.id);
  }
  return {
    ...chat,
    channel,
    members,
    colorMap,
    itemSet,
    compose,
    initialized,
    eventAfter,
  };
};

export const handleMoveFinish = (
  state: ChatState,
  action: Action,
  myId?: Id,
): ChatState | undefined => {
  const actions = state.postponed;
  state = { ...state, postponed: List(), moving: false };
  return actions.reduce<ChatState | undefined>(
    (state, action) => chatReducer(state, action, myId),
    state,
  );
};

export const handleRevealMessage = (state: ChatState, message: Message, myId?: Id): ChatState => {
  return handleEditMessage(state, message, myId);
};

export const checkMessagesOrder = (itemSet: ChatItemSet) => {
  let prevPos = -1.0;
  for (const item of itemSet.messages) {
    if (item.pos <= prevPos) {
      console.warn('incorrect messages order');
    }
    prevPos = item.pos;
  }
};

const handleSpaceUpdate = (
  state: ChatState,
  spaceWithRelated: SpaceWithRelated,
): ChatState | undefined => {
  const { channels } = spaceWithRelated;
  const channel = channels.find((channel) => state.channel.id === channel.id);
  if (!channel) {
    return undefined;
  }
  const members = makeMembers(
    state.channel.id,
    spaceWithRelated.members,
    spaceWithRelated.channelMembers,
  );

  return { ...state, channel, members };
};

export const chatReducer = (
  state: ChatState | undefined,
  action: Action,
  myId: Id | undefined,
): ChatState | undefined => {
  if (state === undefined) {
    return undefined;
  }

  switch (action.type) {
    case 'SET_COMPOSE_SOURCE':
      return handleSetComposeSource(state, action);
    case 'SET_IS_ACTION':
      return handleSetIsAction(state, action);
    case 'SET_BROADCAST':
      return handleSetBroadcast(state, action);
    case 'SET_IN_GAME':
      return handleSetInGame(state, action);
    case 'ADD_DICE':
      return handleAddDice(state, action);
    case 'SET_INPUT_NAME':
      return handleSetInputName(state, action);
    case 'SET_COMPOSE_MEDIA':
      return handleSetComposeMedia(state, action);
    case 'SET_WHISPER_TO':
      return handleSetWhisperTo(state, action);
    case 'CANCEL_EDIT':
      return handleCancelEdit(state, action);
    case 'RESTORE_COMPOSE_STATE':
      return handleComposeRestore(state, action);
    case 'COMPOSE_SEND_FAILED':
      return handleComposeSendFailed(state, action);
    case 'COMPOSE_SENDING':
      return { ...state, compose: { ...state.compose, sending: true } };
    case 'COMPOSE_SENT':
      return { ...state, compose: { ...state.compose, sending: false } };
    case 'COMPOSE_EDIT_FAILED':
      return handleComposeEditFailed(state, action);
    case 'RESET_COMPOSE_AFTER_SENT':
      return handleResetComposeAfterSent(state, action);
    case 'FINISH_MOVE_MESSAGE':
      return handleMoveFinish(state, action, myId);
    case 'SPACE_UPDATED':
      return handleSpaceUpdate(state, action.spaceWithRelated);
    case 'SPACE_DELETED':
      if (state.channel.spaceId === action.spaceId) {
        return closeChat(state, state.channel.id);
      }
      break;
    case 'CHAT_UPDATE':
      return updateChat(state, action);
    case 'CLOSE_CHAT':
      return closeChat(state, action.id);
    case 'TOGGLE_SHOW_FOLDED':
      return { ...state, showFolded: !state.showFolded };
    case 'REVEAL_MESSAGE':
      return handleRevealMessage(state, action.message, myId);
    case 'LOAD_MESSAGES':
      return loadMessages(state, action, myId);
    case 'MOVING_MESSAGE':
      return handleMessageMoving(state, action);
    case 'START_MOVE_MESSAGE':
      return { ...state, moving: true };
    case 'RESET_MESSAGE_MOVING':
      return handleResetMessageMoving(state, action);
    case 'CHAT_FILTER':
      return { ...state, filter: action.filter };
    case 'START_EDIT_MESSAGE':
      return handleStartEditMessage(state, action);
    case 'EVENT_RECEIVED':
      return handleChannelEvent(state, action.event, myId);
  }
  return state;
};
