import type { MoveMessageBetween } from 'server-bindings/MoveMessageBetween';
import { PreSign } from 'server-bindings/PreSign';
import { PreSignResult } from 'server-bindings/PreSignResult';
import type { Empty } from 'utils';
import type {
  AddChannelMember,
  Channel,
  ChannelMember,
  ChannelWithMember,
  CreateChannel,
  EditChannel,
  EditChannelMember,
  GrantOrRemoveChannelMaster,
  JoinChannel,
  KickFromChannel,
} from './types/channels';
import type { Message, NewMessage } from './types/messages';
import type {
  CreateSpace,
  EditSpace,
  KickFromSpace,
  Space,
  SpaceMemberWithUser,
  SpaceWithMember,
} from './types/spaces';
import type {
  EditUser,
  LoginData,
  LoginReturn,
  RegisterData,
  ResetPassword,
  ResetPasswordConfirm,
  User,
} from './types/users';

export interface Post {
  // users
  '/users/login': { payload: LoginData; query: null; result: LoginReturn };
  '/users/register': { payload: RegisterData; query: null; result: User };
  '/users/edit': { payload: Partial<EditUser>; query: null; result: User };
  '/users/remove_avatar': { payload: null; query: null; result: User };
  '/users/reset_password': { payload: ResetPassword; query: null; result: null };
  '/users/reset_password_confirm': { payload: ResetPasswordConfirm; query: null; result: null };
  // spaces
  '/spaces/create': { payload: CreateSpace; query: null; result: SpaceWithMember };
  '/spaces/edit': { payload: EditSpace; query: null; result: Space };
  '/spaces/delete': { payload: Empty; query: { id: string }; result: Space };
  '/spaces/refresh_token': { payload: Empty; query: { id: string }; result: string };
  '/spaces/join': { payload: Empty; result: SpaceWithMember; query: { spaceId: string; token?: string } };
  '/spaces/leave': { payload: Empty; query: { id: string }; result: true };
  '/spaces/kick': { payload: Empty; query: KickFromSpace; result: Record<string, SpaceMemberWithUser> };
  // messages
  '/messages/send': { payload: NewMessage; query: null; result: Message };
  '/messages/move_between': { payload: MoveMessageBetween; query: null; result: Message };
  '/messages/delete': { payload: Empty; query: { id: string }; result: Message };
  '/messages/toggle_fold': { payload: Empty; query: { id: string }; result: Message };
  // channels
  '/channels/create': { payload: CreateChannel; query: null; result: ChannelWithMember };
  '/channels/join': { payload: JoinChannel; query: null; result: ChannelWithMember };
  '/channels/leave': { payload: Empty; query: { id: string }; result: true };
  '/channels/kick': { payload: Empty; query: KickFromChannel; result: ChannelMember };
  '/channels/edit': { payload: EditChannel; query: null; result: Channel };
  '/channels/delete': { payload: Empty; query: { id: string }; result: Channel };
  '/channels/edit_member': { payload: EditChannelMember; query: null; result: ChannelMember };
  '/channels/add_member': { payload: AddChannelMember; query: null; result: ChannelWithMember };
  '/channels/edit_master': { payload: GrantOrRemoveChannelMaster; query: null; result: true };
  // meida
  '/media/presigned': { query: PreSign; payload: Empty; result: PreSignResult };
}
