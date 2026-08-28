import type {
  AppSettings,
  Asset,
  Channel,
  ChannelMemberWithUser,
  ChannelMembers,
  ChannelWithMaybeMember,
  CheckEmailExists,
  CheckCharacterIdentifier,
  CheckEntryIdentifier,
  CheckUsernameExists,
  Character,
  CharacterUsage,
  Entry,
  EntryComponentMatch,
  EntryMetadata,
  EntryComponentHistory,
  EntryComponentHistoryQuery,
  EntryHistory,
  EntryHistoryQuery,
  EmailVerificationStatus,
  Export,
  GetMessagesByChannel,
  ListCharacters,
  ListEntriesByComponent,
  ListAssets,
  ListEntries,
  ListNotes,
  MakeToken,
  MediaInfo,
  MediaInfoQuery,
  Message,
  Note,
  NoteContentRevision,
  NoteMetadata,
  QueryNote,
  QueryAsset,
  QueryCharacter,
  QueryEntry,
  SearchMessagesParams,
  SearchMessagesResult,
  Space,
  SpaceMember,
  SpaceMemberWithUser,
  SpaceWithMember,
  SpaceWithRelated,
  User,
  UserStatus,
  VerifyEmail,
} from '@boluo/types/bindings';

export interface Get {
  // assets
  '/assets/query': { query: QueryAsset; result: Asset };
  '/assets/by_space': { query: ListAssets; result: Asset[] };
  '/assets/by_creator': { query: null; result: Asset[] };
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
  '/channels/query': { query: { id: string; spaceId?: string }; result: Channel };
  '/channels/by_space': { query: { id: string }; result: ChannelWithMaybeMember[] };
  '/channels/members': { query: { id: string; spaceId?: string }; result: ChannelMembers };
  '/channels/all_members': {
    query: { id: string; spaceId?: string };
    result: ChannelMemberWithUser[];
  };
  '/channels/check_name': { query: { name: string; spaceId: string }; result: boolean };
  '/channels/export': { query: Export; result: Message[] };
  // messages
  '/messages/by_channel': { query: GetMessagesByChannel; result: Message[] };
  '/messages/query': { query: { id: string }; result: Message | null };
  '/messages/search': {
    query: SearchMessagesParams;
    result: SearchMessagesResult;
  };
  // media
  '/media/info': { query: MediaInfoQuery; result: MediaInfo };
  // notes
  '/notes/query': { query: QueryNote; result: Note };
  '/notes/by_space': { query: ListNotes; result: NoteMetadata[] };
  '/notes/content_revisions': { query: QueryNote; result: NoteContentRevision[] };
  // entries
  '/entries/by_scope': { query: ListEntries; result: EntryMetadata[] };
  '/entries/by_component': {
    query: ListEntriesByComponent;
    result: EntryComponentMatch[];
  };
  '/entries/query': { query: QueryEntry; result: Entry };
  '/entries/history': { query: EntryHistoryQuery; result: EntryHistory[] };
  '/entries/component_history': {
    query: EntryComponentHistoryQuery;
    result: EntryComponentHistory[];
  };
  '/entries/check_identifier': { query: CheckEntryIdentifier; result: boolean };
  // characters
  '/characters/query': { query: QueryCharacter; result: Character };
  '/characters/by_space': { query: ListCharacters; result: Character[] };
  '/characters/usages': { query: QueryCharacter; result: CharacterUsage[] };
  '/characters/check_identifier': { query: CheckCharacterIdentifier; result: boolean };
  // updates (formerly known as events)
  '/updates/token': { query: MakeToken; result: { token: string; issuedAt: number } };
  // info
  '/info/settings': { query: null; result: AppSettings };
}
