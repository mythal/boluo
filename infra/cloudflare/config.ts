export const accountId = '9a7f9f4ce45406e8224c0f1e9e6785b5';

export type ZoneResourceKey = 'boluo_chat' | 'boluochat_com';

export interface ZoneConfig {
  readonly id: string;
  readonly name: string;
  readonly resourceKey: ZoneResourceKey;
}

export const zones = {
  boluoChat: {
    id: '86a24b35cb9e6b6050054860ffd78742',
    name: 'boluo.chat',
    resourceKey: 'boluo_chat',
  },
  boluochatCom: {
    id: '2459c4cdb9b25db7be5a35a19535846b',
    name: 'boluochat.com',
    resourceKey: 'boluochat_com',
  },
} as const satisfies Record<string, ZoneConfig>;

export const zoneList = [zones.boluoChat, zones.boluochatCom] as const;
