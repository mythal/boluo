import type { User } from '@boluo/api';

export const mediaUrl = 'https://media.boluochat.com';

export const baseUser: User = {
  id: 'iroha',
  username: 'iroha',
  nickname: 'Iroha',
  bio: 'UwU!',
  joined: '2024-01-15T10:30:00Z',
  avatarId: null,
  defaultColor: '#3b82f6',
};

export const userWithAvatar: User = {
  ...baseUser,
  id: 'smol-latern',
  username: 'xiaolatern',
  nickname: '小灯',
  avatarId: '6e8bcc86-6521-11f0-8003-4a6d51bbb76e',
  bio: '正在鼓捣菠萝',
};

export const userWithLongBio: User = {
  ...baseUser,
  bio: '色は匂へど 散りぬるを 我が世誰ぞ 常ならむ 有為の奥山 今日越えて 浅き夢見し 酔ひもせず',
};

export const userWithoutBio: User = {
  ...baseUser,
  bio: '',
};

export const userWithLongNames: User = {
  ...baseUser,
  username: 'thisisaverylongusernamethatexceedsthenormallength',
  nickname: 'This is a very long nickname that might overflow',
};

export const userMinimal: User = {
  id: 'user-minimal',
  username: 'minimal',
  nickname: 'Min',
  bio: '',
  joined: '2024-12-01T00:00:00Z',
  avatarId: null,
  defaultColor: '',
};
