import type { MoveMessageBetween, PreSign, PreSignResult } from '@boluo/api';
import { type Empty } from '@boluo/types';
import type {
  AddChannelMember,
  ArchiveCharacter,
  ArchiveNote,
  Asset,
  Channel,
  ChannelMember,
  ChannelWithMember,
  Character,
  CreateCharacter,
  CreateAsset,
  CreateChannel,
  CreateEntry,
  CreateNote,
  CreateSpace,
  DeleteAsset,
  DeleteEntry,
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
  Entry,
  MessageEntryEffects,
  Message,
  MessageIdQuery,
  NewMessage,
  Note,
  QueryEntryEffectsByMessages,
  Register as RegisterData,
  ResendEmailVerification,
  ResendEmailVerificationResult,
  RestoreCharacter,
  RestoreNote,
  ResetPassword,
  ResetPasswordConfirm,
  Space,
  SpaceMemberWithUser,
  SpaceWithMember,
  User,
  UpdateAsset,
} from '@boluo/types/bindings';

export interface Post {
  // assets
  '/assets/create': { payload: CreateAsset; query: null; result: Asset };
  '/assets/update': { payload: UpdateAsset; query: null; result: Asset };
  '/assets/delete': { payload: DeleteAsset; query: null; result: Asset };
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
  '/messages/delete': { payload: Empty; query: MessageIdQuery; result: Message };
  '/messages/toggle_fold': { payload: Empty; query: MessageIdQuery; result: Message };
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
  // notes
  '/notes/create': { payload: CreateNote; query: null; result: Note };
  '/notes/archive': { payload: ArchiveNote; query: null; result: true };
  '/notes/restore': { payload: RestoreNote; query: null; result: true };
  // entries
  '/entries/create': { payload: CreateEntry; query: null; result: Entry };
  '/entries/delete': { payload: DeleteEntry; query: null; result: true };
  '/entries/effects_by_messages': {
    payload: QueryEntryEffectsByMessages;
    query: null;
    result: MessageEntryEffects[];
  };
  // characters
  '/characters/create': { payload: CreateCharacter; query: null; result: Character };
  '/characters/archive': { payload: ArchiveCharacter; query: null; result: Character };
  '/characters/restore': { payload: RestoreCharacter; query: null; result: Character };
  // media
  '/media/presigned': { query: PreSign; payload: Empty; result: PreSignResult };
}
