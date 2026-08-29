import assert from 'node:assert/strict';
import test from 'node:test';
import { List, Map } from 'immutable';
import type { Action } from '../actions';
import type { Channel, ChannelMember, MemberWithUser } from '../api/channels';
import type { Message } from '../api/messages';
import type { Space, SpaceMember, SpaceWithRelated } from '../api/spaces';
import type { User } from '../api/users';
import type { ChatState } from './chatState';
import { handleSpaceUpdate } from './chatStateMap';

const spaceId = 'space-1';
const channelId = 'channel-1';
const secondChannelId = 'channel-2';
const removedChannelId = 'channel-removed';
const userId = 'user-1';

const makeChatState = (channel: Channel): ChatState => ({
  channel,
  members: [],
  colorMap: Map(),
  postponed: List<Action>(),
  initialHistoryLoad: null,
  moving: false,
  showFolded: false,
  filter: 'NONE',
  finished: false,
  initialized: true,
  eventAfter: { timestamp: 42, node: 1, seq: 2 },
  historyMutationGeneration: 3,
  itemSet: {
    messages: List([
      {
        type: 'MESSAGE',
        id: 'history-message',
        pos: 1,
        mine: false,
        message: { id: 'history-message', channelId: channel.id, pos: 1 } as Message,
      },
    ]),
    previews: Map(),
  },
  lastLoadBefore: 10,
  compose: {
    initialized: true,
    inputName: 'Alice',
    entities: [],
    sending: false,
    edit: null,
    messageId: 'message-1',
    media: undefined,
    isAction: false,
    source: 'draft',
    whisperTo: null,
    inGame: true,
    broadcast: true,
  },
});

test('handleSpaceUpdate preserves existing chat state while refreshing metadata', () => {
  const channel = { id: channelId, spaceId, name: 'Old name' } as Channel;
  const updatedChannel = { ...channel, name: 'New name' };
  const removedChannel = { id: removedChannelId, spaceId } as Channel;
  const secondChannel = { id: secondChannelId, spaceId, name: 'Second old name' } as Channel;
  const updatedSecondChannel = { ...secondChannel, name: 'Second new name' };
  const chat = makeChatState(channel);
  const secondChat = makeChatState(secondChannel);
  const removedChat = makeChatState(removedChannel);
  const user = { id: userId } as User;
  const spaceMember = { userId, spaceId } as SpaceMember;
  const channelMember = { userId, channelId } as ChannelMember;
  const snapshot: SpaceWithRelated = {
    space: { id: spaceId } as Space,
    channels: [updatedChannel, updatedSecondChannel],
    members: { [userId]: { user, space: spaceMember } },
    channelMembers: { [channelId]: [channelMember] },
    usersStatus: {},
  };

  const next = handleSpaceUpdate(
    Map([
      [channelId, chat],
      [secondChannelId, secondChat],
      [removedChannelId, removedChat],
    ]),
    { type: 'SPACE_UPDATED', spaceWithRelated: snapshot },
  );
  const refreshed = next.get(channelId);

  assert.ok(refreshed);
  assert.strictEqual(refreshed.channel, updatedChannel);
  assert.deepStrictEqual(refreshed.members, [
    { user, space: spaceMember, channel: channelMember } satisfies MemberWithUser,
  ]);
  assert.strictEqual(refreshed.itemSet, chat.itemSet);
  assert.strictEqual(refreshed.itemSet.messages.size, 1);
  assert.strictEqual(refreshed.compose, chat.compose);
  assert.strictEqual(refreshed.eventAfter, chat.eventAfter);
  assert.strictEqual(refreshed.historyMutationGeneration, chat.historyMutationGeneration);
  assert.strictEqual(next.get(secondChannelId)?.channel, updatedSecondChannel);
  assert.strictEqual(next.get(secondChannelId)?.itemSet, secondChat.itemSet);
  assert.strictEqual(next.has(removedChannelId), false);
});
