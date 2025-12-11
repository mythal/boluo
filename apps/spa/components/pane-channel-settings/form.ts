import { type ChannelType } from '@boluo/api';

export interface ChannelSettingsForm {
  name: string;
  topic: string;
  defaultDiceType: string;
  defaultRollCommand: string;
  isSecret: boolean;
  type: ChannelType;
  isArchived: boolean;
}
