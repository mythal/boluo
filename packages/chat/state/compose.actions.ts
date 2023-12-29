import { Message } from 'api';
import type { Empty } from 'utils';
import { MakeAction } from './actions';
import type { ComposeState } from './compose.reducer';

export type ComposeActionMap = {
  setSource: { channelId: string; source: string };
  setInputedName: { inputedName: string };
  toggleInGame: { inGame?: boolean };
  toggleBroadcast: Empty;
  addDice: Empty;
  link: { text: string; href: string };
  bold: { text: string };
  recoverState: ComposeState;
  media: { media: File | null };
  editMessage: { message: Message };
  sent: Empty;
  reset: Empty;
  focus: Empty;
  blur: Empty;
  setRange: { range: [number, number] | null };
  addWhisperTarget: { username: string };
  removeWhisperTarget: { username: string };
  toggleAction: Empty;
  toggleWhisper: { username?: string };
};

export type ComposeActionUnion = MakeAction<ComposeActionMap, keyof ComposeActionMap>;
export type ComposeAction<T extends keyof ComposeActionMap> = MakeAction<ComposeActionMap, T>;
