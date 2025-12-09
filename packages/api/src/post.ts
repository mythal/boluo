import type { MoveMessageBetween, PreSign, PreSignResult } from '@boluo/api';
import { type Empty } from '@boluo/types';
import type {
  AddChannelMember,
  Channel,
  ChannelMember,
  ChannelWithMember,
  CreateChannel,
  CreateSpace,
  EditChannel,
  EditChannelMember,
  EditChannelTopic,
  EditSpace,
  EditUser,
  GrantOrRemoveChannelMaster,
  JoinChannel,
  KickFromChannel,
  KickFromSpace,
  Login as LoginData,
  LoginReturn,
  Message,
  NewMessage,
  Register as RegisterData,
  ResendEmailVerification,
  ResendEmailVerificationResult,
  ResetPassword,
  ResetPasswordConfirm,
  Space,
  SpaceMemberWithUser,
  SpaceWithMember,
  User,
} from '@boluo/types/bindings';

export interface Post {
  // users
  '/users/login': { payload: LoginData; query: null; result: LoginReturn };
  '/users/register': { payload: RegisterData; query: null; result: User };
  '/users/edit': { payload: Partial<EditUser>; query: null; result: User };
  '/users/remove_avatar': { payload: null; query: null; result: User };
  '/users/reset_password': { payload: ResetPassword; query: null; result: null };
  '/users/reset_password_confirm': { payload: ResetPasswordConfirm; query: null; result: null };
  '/users/resend_email_verification': {
    payload: ResendEmailVerification;
    query: null;
    result: ResendEmailVerificationResult;
  };
  // spaces
  '/spaces/create': { payload: CreateSpace; query: null; result: SpaceWithMember };
  '/spaces/edit': { payload: EditSpace; query: null; result: Space };
  '/spaces/delete': { payload: Empty; query: { id: string }; result: Space };
  '/spaces/refresh_token': { payload: Empty; query: { id: string }; result: string };
  '/spaces/join': {
    payload: Empty;
    result: SpaceWithMember;
    query: { spaceId: string; token?: string };
  };
  '/spaces/leave': { payload: Empty; query: { id: string }; result: true };
  '/spaces/kick': {
    payload: Empty;
    query: KickFromSpace;
    result: Record<string, SpaceMemberWithUser>;
  };
  '/spaces/update_settings': { payload: unknown; query: { id: string }; result: unknown };
  // messages
  '/messages/send': { payload: NewMessage; query: null; result: Message };
  '/messages/move_between': { payload: MoveMessageBetween; query: null; result: Message };
  '/messages/delete': { payload: Empty; query: { id: string }; result: Message };
  '/messages/toggle_fold': { payload: Empty; query: { id: string }; result: Message };
  // channels
  '/channels/create': { payload: CreateChannel; query: null; result: ChannelWithMember };
  '/channels/join': { payload: JoinChannel; query: null; result: ChannelWithMember };
  '/channels/leave': { payload: Empty; query: { id: string }; result: true };
  '/channels/kick': { payload: Empty; query: KickFromChannel; result: true };
  '/channels/edit': { payload: EditChannel; query: null; result: Channel };
  '/channels/delete': { payload: Empty; query: { id: string }; result: Channel };
  '/channels/edit_member': { payload: EditChannelMember; query: null; result: ChannelMember };
  '/channels/add_member': { payload: AddChannelMember; query: null; result: ChannelWithMember };
  '/channels/edit_master': { payload: GrantOrRemoveChannelMaster; query: null; result: true };
  '/channels/edit_topic': { payload: EditChannelTopic; query: null; result: Channel };
  // meida
  '/media/presigned': { query: PreSign; payload: Empty; result: PreSignResult };
}
