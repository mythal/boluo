import { Entity } from './entities';
import { Result, Ok, Err } from './result';

export type ValidatorResult = Result<undefined, string>;

const ok: ValidatorResult = new Ok(undefined);

export const getErrorMessage = (result: ValidatorResult): string => {
  return result.isErr ? result.value : '';
};

export function checkEmailFormat(email: string): ValidatorResult {
  // tslint:disable-next-line:max-line-length
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (re.test(String(email).toLowerCase())) {
    return ok;
  } else {
    return new Err('Invalid email address.');
  }
}

export function checkName(username: string): ValidatorResult {
  if (!/^[\w_\d]+$/.test(username)) {
    return new Err('Name can only contain letters, "_" and numbers.');
  } else if (username.length < 3) {
    return new Err('Name must be at least 3 characters.');
  } else if (username.length > 32) {
    return new Err('Name must be at most 32 characters.');
  }
  return ok;
}

export function checkDisplayName(nickname: string): ValidatorResult {
  const NAME_MAX_LENGTH = 32;
  if (nickname.length < 2) {
    return new Err('Name length shall not be less than 2.\n');
  } else if (nickname.length > NAME_MAX_LENGTH) {
    return new Err(`Name must be less than ${NAME_MAX_LENGTH} characters.`);
  }
  return ok;
}

export function checkPassword(password: string): ValidatorResult {
  const MIN_PASSWORD_LENGTH = 8;
  if (password.length < MIN_PASSWORD_LENGTH) {
    return new Err(`Password must have at least ${MIN_PASSWORD_LENGTH} characters.`);
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
