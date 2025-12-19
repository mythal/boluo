import type {
  AppSettings,
  Channel,
  ChannelMemberWithUser,
  ChannelMembers,
  ChannelWithMaybeMember,
  CheckEmailExists,
  CheckCharacterName,
  CheckUsernameExists,
  CheckVariableAvailability,
  Character,
  CharacterVariable,
  CharacterVariableHistory,
  EmailVerificationStatus,
  Export,
  GetMessagesByChannel,
  ListCharacters,
  MakeToken,
  Message,
  Note,
  NoteHistory,
  SearchMessagesParams,
  SearchMessagesResult,
  Space,
  SpaceMember,
  SpaceMemberWithUser,
  SpaceWithMember,
  SpaceWithRelated,
  User,
  UserStatus,
  VariableHistoryQuery,
  VerifyEmail,
} from '@boluo/types/bindings';

export interface Get {
  // users
  '/users/query': { query: { id: string | null }; result: User | null };
  '/users/query_self': { query: null; result: User | null };
  '/users/logout': { query: null; result: true };
  '/users/settings': { query: null; result: unknown };
  '/users/check_username': { query: CheckUsernameExists; result: boolean };
  '/users/check_email': { query: CheckEmailExists; result: boolean };
  '/users/verify_email': { query: VerifyEmail; result: boolean };
  '/users/email_verification_status': { query: null; result: EmailVerificationStatus };
  // spaces
  '/spaces/users_status': { query: { id: string }; result: Record<string, UserStatus> };
  '/spaces/query': { query: { id: string; token?: string }; result: Space };
  '/spaces/my': { query: null; result: SpaceWithMember[] };
  '/spaces/query_with_related': { query: { id: string }; result: SpaceWithRelated };
  '/spaces/my_space_member': { query: { id: string }; result: SpaceMember | null };
  '/spaces/members': { query: { id: string }; result: Record<string, SpaceMemberWithUser> };
  '/spaces/token': { query: { id: string }; result: string };
  '/spaces/settings': { query: { id: string }; result: unknown };
  // channels
  '/channels/query': { query: { id: string }; result: Channel };
  '/channels/by_space': { query: { id: string }; result: ChannelWithMaybeMember[] };
  '/channels/members': { query: { id: string }; result: ChannelMembers };
  '/channels/all_members': { query: { id: string }; result: ChannelMemberWithUser[] };
  '/channels/check_name': { query: { name: string; spaceId: string }; result: boolean };
  '/channels/export': { query: Export; result: Message[] };
  // messages
  '/messages/by_channel': { query: GetMessagesByChannel; result: Message[] };
  '/messages/query': { query: { id: string }; result: Message | null };
  '/messages/search': {
    query: SearchMessagesParams;
    result: SearchMessagesResult;
  };
  // notes
  '/notes/query': { query: { id: string }; result: Note };
  '/notes/by_space': { query: { id: string }; result: Note[] };
  '/notes/history': { query: { id: string }; result: NoteHistory[] };
  // characters
  '/characters/query': { query: { id: string }; result: Character };
  '/characters/by_space': { query: ListCharacters; result: Character[] };
  '/characters/variables': { query: { id: string }; result: CharacterVariable[] };
  '/characters/variable_history': {
    query: VariableHistoryQuery;
    result: CharacterVariableHistory[];
  };
  '/characters/check_name': { query: CheckCharacterName; result: boolean };
  '/characters/check_variable': { query: CheckVariableAvailability; result: boolean };
  // events
  '/events/token': { query: MakeToken; result: { token: string } };
  // info
  '/info/settings': { query: null; result: AppSettings };
}
