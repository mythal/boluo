import { type Message } from '@boluo/api';
import { type Empty } from '@boluo/types';
import { type MakeAction } from './actions';
import type { ComposeState } from './compose.reducer';
import type { CharacterPortraitSelection } from './characterPortraitSelection';

export type ComposeActionMap = {
  setSource: { channelId: string; source: string };
  setAsTargetText: { text: string; setInGame?: boolean };
  selectCharacterPortrait: CharacterPortraitSelection | null;
  toggleInGame: { defaultInGame: boolean };
  setInGame: { inGame: boolean };
  toggleBroadcast: Empty;
  addDice: { defaultRollCommand: string };
  link: { text: string; href: string };
  bold: { text: string };
  recoverState: ComposeState;
  restoreFailedEdit: ComposeState;
  media: { media: File | null };
  editMessage: { message: Message };
  sent: { edit?: boolean; collapseCharacterReference?: boolean };
  reset: { restore?: boolean };
  focus: Empty;
  blur: Empty;
  setRange: { range: [number, number] | null };
  addWhisperTarget: { username: string };
  removeWhisperTarget: { username: string };
  toggleAction: Empty;
  toggleWhisper: { usernames: string[] };
  collided: { previewId: string; newPreviewId: string };
  compositionStart: Empty;
  compositionEnd: Empty;
};

export type ComposeActionUnion = MakeAction<ComposeActionMap, keyof ComposeActionMap>;
export type ComposeAction<T extends keyof ComposeActionMap> = MakeAction<ComposeActionMap, T>;
