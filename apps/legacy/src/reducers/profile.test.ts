import assert from 'node:assert/strict';
import test from 'node:test';
import type { Action } from '../actions';
import type { Channel, ChannelMember, ChannelWithMember } from '../api/channels';
import type { Space, SpaceMember, SpaceWithMember, SpaceWithRelated } from '../api/spaces';
import type { User } from '../api/users';
import { Ok } from '../utils/result';
import { profileReducer, type ProfileState } from './profile';

const user = { id: 'user-1' } as User;
const otherUser = { id: 'user-2' } as User;
const firstSpace = { id: 'space-1' } as Space;
const secondSpace = { id: 'space-2' } as Space;
const firstSpaceMember = { userId: user.id, spaceId: firstSpace.id } as SpaceMember;
const secondSpaceMember = { userId: user.id, spaceId: secondSpace.id } as SpaceMember;
const oldChannel = { id: 'channel-old', spaceId: firstSpace.id } as Channel;
const joinedChannel = { id: 'channel-joined', spaceId: firstSpace.id } as Channel;
const privateChannel = { id: 'channel-private', spaceId: firstSpace.id } as Channel;
const otherSpaceChannel = { id: 'channel-other-space', spaceId: secondSpace.id } as Channel;

const channelWithMember = (channel: Channel): ChannelWithMember => ({
  channel,
  member: { channelId: channel.id, userId: user.id } as ChannelMember,
});

const spaceWithMember = (space: Space, member: SpaceMember): SpaceWithMember => ({
  space,
  member,
  user,
});

const makeProfile = (): ProfileState =>
  profileReducer(undefined, {
    type: 'LOGGED_IN',
    user,
    settings: {},
    mySpaces: [
      spaceWithMember(firstSpace, firstSpaceMember),
      spaceWithMember(secondSpace, secondSpaceMember),
    ],
    myChannels: [channelWithMember(oldChannel), channelWithMember(otherSpaceChannel)],
  })!;

const makeSpaceSnapshot = (isSpaceMember: boolean): SpaceWithRelated => {
  const joinedChannelMember = {
    channelId: joinedChannel.id,
    userId: user.id,
  } as ChannelMember;
  return {
    space: firstSpace,
    members: isSpaceMember
      ? { [user.id]: { space: firstSpaceMember, user } }
      : { [otherUser.id]: { space: {} as SpaceMember, user: otherUser } },
    channels: [joinedChannel, privateChannel],
    channelMembers: {
      [joinedChannel.id]: [joinedChannelMember],
      [privateChannel.id]: [
        { channelId: privateChannel.id, userId: otherUser.id } as ChannelMember,
      ],
    },
    usersStatus: {},
  };
};

const loadSpace = (state: ProfileState, snapshot: SpaceWithRelated): ProfileState => {
  const action: Action = {
    type: 'SPACE_LOADED',
    spaceId: snapshot.space.id,
    result: new Ok(snapshot),
  };
  return profileReducer(state, action)!;
};

test('legacy profileReducer replaces channel memberships from a loaded space snapshot', () => {
  const next = loadSpace(makeProfile(), makeSpaceSnapshot(true));

  assert.strictEqual(next.channels.has(oldChannel.id), false);
  assert.strictEqual(next.channels.has(joinedChannel.id), true);
  assert.strictEqual(next.channels.has(privateChannel.id), false);
  assert.strictEqual(next.channels.has(otherSpaceChannel.id), true);
});

test('legacy profileReducer removes space memberships absent from a loaded snapshot', () => {
  const next = loadSpace(makeProfile(), makeSpaceSnapshot(false));

  assert.strictEqual(next.spaces.has(firstSpace.id), false);
  assert.strictEqual(next.channels.has(oldChannel.id), false);
  assert.strictEqual(next.channels.has(otherSpaceChannel.id), true);
});
