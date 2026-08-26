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
  type MessageDeleted,
  type MessageEdited,
  type PreviewDiff,
  type Preview,
  shouldAdvanceCursor,
} from '../api/events';
import { resolvePreviewDiff, toPreviewDiffBase } from '@boluo/api/preview/diff';
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
  deleteMessage,
  editMessage,
  getOldestMessage,
  makeMessageItem,
  markMessageMoving,
  resetMovingMessage,
} from '../states/chat-item-set';
import { type Id, newId } from '../utils/id';
import { captureRecoverableException, recordWarning } from '../error-reporting';

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
  historyMutationGeneration: number;
  lastLoadBefore: number;
  filter: 'IN_GAME' | 'OUT_GAME' | 'NONE';
  showFolded: boolean;
  moving: boolean;
  postponed: List<Action>;
  initialHistoryLoad: {
    requestId: Id;
    pendingMutations: MessageMutation[];
  } | null;
  compose: Compose;
}

type MessageMutation = MessageEdited | MessageDeleted;

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

const messageRev = (message: Message): number => message.rev ?? 0;

const compareMessageVersion = (a: Message, b: Message): number => {
  const revDiff = messageRev(a) - messageRev(b);
  if (revDiff !== 0) return revDiff;
  return Date.parse(a.modified) - Date.parse(b.modified);
};

const eventIdDiagnostic = ({ timestamp, node, seq }: EventId): string =>
  `${timestamp}:${node}:${seq}`;

const messageDiagnostic = (message: Message) => ({
  id: message.id,
  modified: message.modified,
  pos: message.pos,
  rev: message.rev ?? 0,
});

const chatItemDiagnostic = (item: ChatItem) => ({
  id: item.id,
  message: item.type === 'MESSAGE' ? messageDiagnostic(item.message) : undefined,
  pos: item.pos,
  previewId: item.type === 'PREVIEW' ? item.preview.id : undefined,
  type: item.type,
});

const chatLogContext = (
  chat: ChatState,
  action: Action,
  previousCursor: EventId = chat.eventAfter,
) => {
  const event = action.type === 'EVENT_RECEIVED' ? action.event : null;
  return {
    actionType: event?.body.type ?? action.type,
    channelId: chat.channel.id,
    finished: chat.finished,
    historyMutationGeneration: chat.historyMutationGeneration,
    initialHistoryLoading: chat.initialHistoryLoad != null,
    messageCount: chat.itemSet.messages.size,
    pendingMessageMutationCount: chat.initialHistoryLoad?.pendingMutations.length ?? 0,
    previousCursor: event ? eventIdDiagnostic(previousCursor) : undefined,
    requestId:
      action.type === 'LOAD_MESSAGES' && action.mode === 'INITIAL' ? action.requestId : undefined,
    requestedBefore:
      action.type === 'LOAD_MESSAGES' && action.mode === 'MORE' ? action.before : undefined,
    requestedHistoryMutationGeneration:
      action.type === 'LOAD_MESSAGES' && action.mode === 'MORE'
        ? action.historyMutationGeneration
        : undefined,
    spaceId: chat.channel.spaceId,
    updateId: event ? eventIdDiagnostic(event.id) : undefined,
    updateLive: event?.live,
  };
};

const actionDiagnostic = (action: Action): Record<string, unknown> => {
  if (action.type === 'LOAD_MESSAGES') {
    const firstMessage = action.messages[0];
    const lastMessage = action.messages[action.messages.length - 1];
    return {
      before: action.mode === 'MORE' ? action.before : null,
      finished: action.finished,
      firstMessage: firstMessage ? messageDiagnostic(firstMessage) : null,
      lastMessage: lastMessage ? messageDiagnostic(lastMessage) : null,
      messageCount: action.messages.length,
      mode: action.mode,
    };
  }
  if (action.type !== 'EVENT_RECEIVED') return {};
  const { body } = action.event;
  switch (body.type) {
    case 'NEW_MESSAGE':
      return { message: messageDiagnostic(body.message), previewId: body.previewId };
    case 'MESSAGE_EDITED':
      return { message: messageDiagnostic(body.message), oldPos: body.oldPos };
    case 'MESSAGE_DELETED':
      return { messageId: body.messageId, pos: body.pos };
    default:
      return {};
  }
};

const loadMoreMessages = (
  chat: ChatState,
  action: Extract<LoadMessages, { mode: 'MORE' }>,
  myId: Id | undefined,
): ChatState => {
  const { messages, finished, before, historyMutationGeneration } = action;
  if (
    getOldestMessage(chat.itemSet)?.pos !== before ||
    chat.historyMutationGeneration !== historyMutationGeneration
  ) {
    return chat;
  }
  if (messages.length === 0) {
    return { ...chat, finished };
  }
  if (messages.some((message) => message.pos >= before)) {
    const logContext = chatLogContext(chat, action);
    recordWarning('Incorrect messages order in history response', {
      source: 'chat-state',
      context: logContext,
      details: {
        action: actionDiagnostic(action),
      },
    });
    throw new Error('Incorrect messages order');
  }
  return mergeLoadedMessages({ ...chat, finished }, messages, myId);
};

function mergeLoadedMessages(
  chat: ChatState,
  messages: Message[],
  myId: Id | undefined,
): ChatState {
  let itemSet = chat.itemSet;
  for (const message of [...messages].sort((a, b) => a.pos - b.pos)) {
    itemSet = mergeMessage(itemSet, message, myId);
  }
  return { ...chat, itemSet };
}

const mergeMessage = (
  itemSet: ChatItemSet,
  message: Message,
  myId: Id | undefined,
): ChatItemSet => {
  const existingIndex = itemSet.messages.findIndex(
    (item) => item.type === 'MESSAGE' && item.id === message.id,
  );
  if (existingIndex === -1) {
    return addItem(itemSet, makeMessageItem(myId)(message));
  }
  const existingItem = itemSet.messages.get(existingIndex);
  if (
    existingItem?.type !== 'MESSAGE' ||
    compareMessageVersion(existingItem.message, message) >= 0
  ) {
    return itemSet;
  }
  return addItem(
    { ...itemSet, messages: itemSet.messages.remove(existingIndex) },
    makeMessageItem(myId)(message),
  );
};

const startInitialHistoryLoad = (chat: ChatState, requestId: Id): ChatState => ({
  ...chat,
  initialHistoryLoad: { requestId, pendingMutations: [] },
});

const failInitialHistoryLoad = (chat: ChatState, requestId: Id): ChatState => {
  if (chat.initialHistoryLoad?.requestId !== requestId) return chat;
  return { ...chat, initialHistoryLoad: null };
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

const applyMessageUpdate = (chat: ChatState, message: Message, myId: Id | undefined): ChatState => {
  const currentItem = chat.itemSet.messages.find(
    (item) => item.type === 'MESSAGE' && item.id === message.id,
  );
  if (currentItem?.type === 'MESSAGE' && compareMessageVersion(currentItem.message, message) > 0) {
    return chat;
  }
  return handleEditMessage(chat, message, myId);
};

const applyMessageMutation = (
  chat: ChatState,
  mutation: MessageMutation,
  myId: Id | undefined,
): ChatState => {
  if (mutation.type === 'MESSAGE_EDITED') {
    return applyMessageUpdate(chat, mutation.message, myId);
  }
  return { ...chat, itemSet: handleMessageDelete(chat.itemSet, mutation.messageId) };
};

const handleMessageMutation = (
  chat: ChatState,
  mutation: MessageMutation,
  myId: Id | undefined,
): ChatState => {
  const initialHistoryLoad = chat.initialHistoryLoad;
  if (initialHistoryLoad === null) {
    return applyMessageMutation(chat, mutation, myId);
  }
  let nextChat: ChatState = {
    ...chat,
    initialHistoryLoad: {
      ...initialHistoryLoad,
      pendingMutations: [...initialHistoryLoad.pendingMutations, mutation],
    },
  };
  const canApplyImmediately =
    mutation.type === 'MESSAGE_DELETED' ||
    chat.itemSet.messages.some(
      (item) => item.type === 'MESSAGE' && item.id === mutation.message.id,
    );
  if (canApplyImmediately) {
    nextChat = applyMessageMutation(nextChat, mutation, myId);
  }
  return nextChat;
};

const replayMessageMutations = (
  chat: ChatState,
  mutations: MessageMutation[],
  myId: Id | undefined,
): ChatState =>
  mutations.reduce((state, mutation) => applyMessageMutation(state, mutation, myId), chat);

const loadMessages = (chat: ChatState, action: LoadMessages, myId: Id | undefined): ChatState => {
  if (action.mode === 'MORE') {
    return loadMoreMessages(chat, action, myId);
  }
  const initialHistoryLoad = chat.initialHistoryLoad;
  if (initialHistoryLoad?.requestId !== action.requestId) return chat;
  const loadedChat = mergeLoadedMessages(
    { ...chat, finished: action.finished, initialHistoryLoad: null },
    action.messages,
    myId,
  );
  return replayMessageMutations(loadedChat, initialHistoryLoad.pendingMutations, myId);
};

const applyPreviewDiff = (itemSet: ChatItemSet, diff: PreviewDiff): ChatItemSet => {
  const previewItem = itemSet.previews.get(diff.sender);
  if (!previewItem) return itemSet;
  const keyframe = previewItem.keyframe ?? toPreviewDiffBase(previewItem.preview);
  const result = resolvePreviewDiff({
    keyframe,
    currentVersion: previewItem.preview.v ?? keyframe.version,
    diff: diff._,
    parseEntities: (text) => parse(text).entities,
    onParseError: (error) => {
      captureRecoverableException(error, { source: 'preview-diff-parser' });
    },
  });
  if (result == null) return itemSet;
  const { text, name, entities, version } = result;
  const preview: Preview = {
    ...previewItem.preview,
    name,
    text,
    entities,
    v: version,
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
    keyframe: toPreviewDiffBase(preview),
  };
  return addItem(itemSet, item);
};

const newMessage = (itemSet: ChatItemSet, message: Message, myId: Id | undefined): ChatItemSet => {
  return mergeMessage(itemSet, message, myId);
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
  return { ...state, compose: { ...state.compose, sending: false } };
};

const handleComposeSendFailed = (state: ChatState, action: ComposeSendFailed): ChatState => {
  return { ...state, compose: { ...state.compose, sending: false } };
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

const composeInputActions = new Set<Action['type']>([
  'SET_COMPOSE_SOURCE',
  'SET_IS_ACTION',
  'SET_BROADCAST',
  'SET_IN_GAME',
  'ADD_DICE',
  'SET_INPUT_NAME',
  'SET_COMPOSE_MEDIA',
  'SET_WHISPER_TO',
  'CANCEL_EDIT',
  'RESTORE_COMPOSE_STATE',
  'START_EDIT_MESSAGE',
]);

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
  if (body.type === 'NEW_MESSAGE' || body.type === 'MESSAGE_EDITED') {
    const incomingMessage = body.message;
    const itemIndexByPos = binarySearchPos(itemSet.messages, incomingMessage.pos);
    const itemByPos = itemSet.messages.get(itemIndexByPos);
    if (
      itemByPos?.type === 'MESSAGE' &&
      itemByPos.pos === incomingMessage.pos &&
      itemByPos.id !== incomingMessage.id
    ) {
      const action: Action = { type: 'EVENT_RECEIVED', event };
      const logContext = chatLogContext(chat, action);
      recordWarning('Message position collision', {
        source: 'chat-state',
        context: logContext,
        details: {
          conflictingMessage: messageDiagnostic(itemByPos.message),
          incomingMessage: messageDiagnostic(incomingMessage),
        },
      });
    }
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
    case 'MESSAGE_EDITED':
      chat = handleMessageMutation(chat, body, myId);
      return {
        ...chat,
        historyMutationGeneration: chat.historyMutationGeneration + 1,
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
  return applyMessageUpdate(state, message, myId);
};

const MESSAGE_ORDER_CHECK_LIMIT = 512;

const messageOrderCheckAnchor = (chat: ChatState, action: Action): number | null => {
  const { messages } = chat.itemSet;
  switch (action.type) {
    case 'LOAD_MESSAGES':
      return 0;
    case 'MOVING_MESSAGE':
      return binarySearchPos(messages, action.targetItem?.pos ?? action.message.pos);
    case 'RESET_MESSAGE_MOVING': {
      const index = messages.findIndex((item) => item.id === action.messageId);
      return index === -1 ? messages.size - 1 : index;
    }
    case 'REVEAL_MESSAGE':
      return binarySearchPos(messages, action.message.pos);
    case 'EVENT_RECEIVED': {
      const { body } = action.event;
      switch (body.type) {
        case 'NEW_MESSAGE':
        case 'MESSAGE_EDITED':
          return binarySearchPos(messages, body.message.pos);
        case 'MESSAGE_DELETED':
          return binarySearchPos(messages, body.pos);
        case 'MESSAGE_PREVIEW':
          return binarySearchPos(messages, body.preview.pos);
        default:
          return null;
      }
    }
    default:
      return null;
  }
};

export const checkMessagesOrder = (
  chat: ChatState,
  action: Action,
  previousChat: ChatState = chat,
): boolean => {
  const { messages } = chat.itemSet;
  const anchor = messageOrderCheckAnchor(chat, action);
  if (anchor == null) return true;
  const start = Math.max(
    0,
    Math.min(
      anchor - Math.floor(MESSAGE_ORDER_CHECK_LIMIT / 2),
      messages.size - MESSAGE_ORDER_CHECK_LIMIT,
    ),
  );
  const end = Math.min(messages.size, start + MESSAGE_ORDER_CHECK_LIMIT);
  let previousItem: ChatItem | undefined = start === 0 ? undefined : messages.get(start - 1);
  for (let index = start; index < end; index += 1) {
    const item = messages.get(index);
    if (item == null) break;
    if (previousItem != null && item.pos <= previousItem.pos) {
      const logContext = chatLogContext(chat, action, previousChat.eventAfter);
      recordWarning('Incorrect messages order', {
        source: 'chat-state',
        context: logContext,
        details: {
          action: actionDiagnostic(action),
          index,
          item: chatItemDiagnostic(item),
          previousItem: chatItemDiagnostic(previousItem),
        },
      });
      return false;
    }
    previousItem = item;
  }
  return true;
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

  if (state.compose.sending && composeInputActions.has(action.type)) {
    return state;
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
    case 'INITIAL_HISTORY_LOAD_STARTED':
      return startInitialHistoryLoad(state, action.requestId);
    case 'INITIAL_HISTORY_LOAD_FAILED':
      return failInitialHistoryLoad(state, action.requestId);
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
