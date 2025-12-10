import { type RegisterOptions as ValidationRules } from 'react-hook-form';
import { get } from './api/request';
import { type Id } from './utils/id';

export const formatIsNotSupported = '不支持的文件格式';
export const allowImageType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const imageFormatIsNotSupported = '图片只支持 GIF、PNG、JPEG 和 WebP 格式';
export const maxFileSize = 1024 * 1024 * 16;
export const fileSizeExceeded = '文件最大只能 16MiB';
export const maxImageFileSize = 1024 * 1024 * 6;
export const imageSizeExceeded = '图片大小最大只能 6MiB';

export const required = '必须填写这个字段';
export const emailValidation = {
  required,
  pattern: {
    // https://emailregex.com/
    value: /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
    message: 'E-mail 地址格式不正确，请检查',
  },
  validate: async (email: string) => {
    const result = await get('/users/check_email', { email });
    if (!result.isOk) {
      console.warn(result);
    } else if (result.value) {
      return '这个 E-mail 地址已经存在，是否已经注册了？';
    }
    return true;
  },
} satisfies ValidationRules;
export const nicknameValidation = {
  required,
  minLength: {
    value: 2,
    message: '昵称至少需要两个字符',
  },
  validate: (nickname: string = '') => {
    const striped = nickname.replace(/\s/g, '');
    if (striped.length === 0) {
      return '昵称不能为空';
    } else if (striped.length < 2) {
      return '昵称至少需要两个字符';
    }
  },
  maxLength: {
    value: 32,
    message: '昵称至少最多只能有32字符',
  },
} satisfies ValidationRules;
export const usernameValidation = {
  required,
  pattern: {
    value: /^[\w_\d]+$/,
    message: '用户名只允许包含字母、下划线或数字',
  },
  minLength: {
    value: 3,
    message: '用户名至少需要3个字符',
  },
  maxLength: {
    value: 32,
    message: '用户名最多只能有32个字符',
  },
  validate: async (username: string) => {
    const result = await get('/users/check_username', { username });
    if (!result.isOk) {
      console.warn(result);
    } else if (result.value) {
      return '这个用户名已经存在';
    }
    return true;
  },
} satisfies ValidationRules;
export const passwordValidation = {
  required,
  minLength: {
    value: 8,
    message: '密码至少需要有 8 个字符',
  },
  maxLength: {
    value: 2048,
    message: '密码太长了',
  },
} satisfies ValidationRules;
export const bioValidation = {
  maxLength: {
    value: 256,
    message: '简介长度不能超过 256 字符',
  },
} satisfies ValidationRules;
export const spaceNameValidation = {
  required: '必须填写位面名',
  maxLength: {
    value: 32,
    message: '位面名不可超过32字符',
  },
  validate: (name: string = '') => {
    const striped = name.replace(/\s/g, '');
    if (striped.length === 0) {
      return '位面名不能为空';
    } else if (striped.length < 2) {
      return '位面名至少需要两个字符';
    }
  },
} satisfies ValidationRules;
export const channelNameValidation = (
  spaceId?: Id,
  currentName?: string,
): ValidationRules<{ name: string }, 'name'> => ({
  required: '必须填写频道名',
  maxLength: {
    value: 32,
    message: '频道名不可超过32字符',
  },
  validate: async (name = '') => {
    const striped = name.replace(/\s/g, '');
    if (striped.length === 0) {
      return '频道名不能为空';
    } else if (striped.length < 2) {
      return '频道名至少需要两个字符';
    }
    if (!spaceId) {
      return;
    }
    if (currentName !== name) {
      const result = await get('/channels/check_name', { spaceId, name });
      if (!result.isOk) {
        console.warn(result);
      } else if (result.value) {
        return '这个频道名已经存在';
      }
    }
  },
});
export const characterNameValidation = {
  maxLength: {
    value: 32,
    message: '角色名最长32字符',
  },
} satisfies ValidationRules;
export const descriptionValidation = {
  maxLength: {
    value: 512,
    message: '简介最多512字符',
  },
} satisfies ValidationRules;
export const channelTopicValidation = {
  maxLength: {
    value: 128,
    message: '频道主题长度不能超过128字符',
  },
} satisfies ValidationRules;
