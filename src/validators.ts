import { ValidationRules } from 'react-hook-form';
import { get } from './api/request';
import { Id } from '@/utils/id';

export const required = '必须填写这个字段';
export const emailValidation: ValidationRules = {
  required,
  pattern: {
    // https://emailregex.com/
    value: /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
    message: 'E-mail 地址格式不正确，请检查',
  },
  validate: async (email) => {
    const result = await get('/users/check_email', { email });
    if (!result.isOk) {
      console.warn(result);
    } else if (result.value) {
      return '这个 E-mail 地址已经存在，是否已经注册了？';
    }
    return true;
  },
};
export const nicknameValidation: ValidationRules = {
  required,
  minLength: {
    value: 2,
    message: '昵称至少需要两个字符',
  },
  validate: (nickname: string) => {
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
};
export const usernameValidation: ValidationRules = {
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
  validate: async (username) => {
    const result = await get('/users/check_username', { username });
    if (!result.isOk) {
      console.warn(result);
    } else if (result.value) {
      return '这个用户名已经存在';
    }
    return true;
  },
};
export const passwordValidation: ValidationRules = {
  required,
  minLength: {
    value: 8,
    message: '密码至少需要有 8 个字符',
  },
  maxLength: {
    value: 2048,
    message: '密码太长了',
  },
};
export const bioValidation: ValidationRules = {
  maxLength: {
    value: 256,
    message: '简介长度不能超过 256 字符',
  },
};
export const spaceNameValidation = (currentName?: string): ValidationRules => ({
  required: '必须填写位面名',
  maxLength: {
    value: 32,
    message: '位面名不可超过32字符',
  },
  validate: async (name: string) => {
    const striped = name.replace(/\s/g, '');
    if (striped.length === 0) {
      return '位面名不能为空';
    } else if (striped.length < 2) {
      return '位面名至少需要两个字符';
    }
    if (currentName !== name) {
      const result = await get('/spaces/check_name', { name });
      if (!result.isOk) {
        console.warn(result);
      } else if (result.value) {
        return '这个位面名已经存在';
      }
    }
  },
});
export const channelNameValidation = (spaceId?: Id, currentName?: string): ValidationRules => ({
  required: '必须填写频道名',
  maxLength: {
    value: 32,
    message: '频道名不可超过32字符',
  },
  validate: async (name: string) => {
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
export const characterNameValidation: ValidationRules = {
  maxLength: {
    value: 32,
    message: '角色名最长32字符',
  },
};
export const descriptionValidation: ValidationRules = {
  maxLength: {
    value: 512,
    message: '简介最多512字符',
  },
};
export const channelTopicValidation: ValidationRules = {
  maxLength: {
    value: 128,
    message: '频道主题长度不能超过128字符',
  },
};
