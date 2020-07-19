import { Entity } from './interpreter/entities';
import { Err, Ok, Result } from './utils/result';

export type ValidatorResult = Result<undefined, string>;

const ok: ValidatorResult = new Ok(undefined);

export const getErrorMessage = (result: ValidatorResult): string => {
  return result.isErr ? result.value : '';
};

export function checkEmail(email: string): ValidatorResult {
  // tslint:disable-next-line:max-line-length
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (re.test(String(email).toLowerCase())) {
    return ok;
  } else {
    return new Err('无效的电子邮箱地址。');
  }
}

export function checkUsername(username: string): ValidatorResult {
  if (!/^[\w_\d]+$/.test(username)) {
    return new Err('名字只允许包含字母、下划线或数字。');
  } else if (username.length < 3) {
    return new Err('名字至少需要3个字符。');
  } else if (username.length > 32) {
    return new Err('名字最多只能有32个字符。');
  }
  return ok;
}

export function checkDisplayName(name: string): ValidatorResult {
  const NAME_MAX_LENGTH = 32;
  if (name.length < 2) {
    return new Err('名字至少需要两个字符。');
  } else if (name.length > NAME_MAX_LENGTH) {
    return new Err(`名字最多只能有${NAME_MAX_LENGTH}个字符。`);
  }
  return ok;
}

export function checkCharacterName(characterName: string): ValidatorResult {
  if (characterName.length === 0) {
    return new Err('角色名不得为空。');
  } else if (characterName.length > 32) {
    return new Err('角色名长度不得超过 32 字符。');
  }
  return ok;
}

export function checkBio(bio: string): ValidatorResult {
  if (bio.length > 256) {
    return new Err('长度不得大于 256 字符');
  }
  return ok;
}

export function checkDescription(text: string): ValidatorResult {
  if (text.length > 256) {
    return new Err('长度不得大于 256 字符');
  }
  return ok;
}

export function checkTopic(topic: string): ValidatorResult {
  if (topic.length > 128) {
    return new Err('长度不得大于 128 字符');
  }
  return ok;
}

export function checkPassword(password: string): ValidatorResult {
  const MIN_PASSWORD_LENGTH = 8;
  if (password.length < MIN_PASSWORD_LENGTH) {
    return new Err(`密码必须至少有${MIN_PASSWORD_LENGTH}个字符.`);
  }
  return ok;
}

export function checkMessage(text: string, entities: Entity[]): ValidatorResult {
  const MESSAGE_TEXT_MAX_LENGTH = 4096;
  if (text.length > MESSAGE_TEXT_MAX_LENGTH) {
    return new Err('Message content too long.');
  } else if (text.trim().length === 0) {
    return new Err('Empty message.');
  }
  try {
    if (entities.length > 1024) {
      return new Err('Too much entities.');
    }
    let prevEnd = -1;
    for (const entity of entities) {
      const end = entity.start + entity.offset;
      if (text.length <= entity.start || entity.start < prevEnd || text.length < end) {
        return new Err('Wrong entity properties.');
      }
      prevEnd = end;
    }
  } catch (e) {
    return new Err('Wrong entities.');
  }
  return ok;
}

export function checkImage(file: File): ValidatorResult {
  const MAX_SIZE = 10 * 1024 * 1024;

  if (file.size > MAX_SIZE) {
    return new Err('文件不得超过 10 MiB');
  }
  if (!file.type.startsWith('image')) {
    return new Err('你上传的不是图片');
  }
  return ok;
}
