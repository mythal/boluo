import { Entity } from './entities';
import { Result } from './result';

const Err = Result.Err;
const ok = Result.Ok(undefined);

export type ValidatorResult = Result.Result<undefined, string>;

export function checkEmailFormat(email: string): boolean {
  // tslint:disable-next-line:max-line-length
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

export function checkUsername(username: string): ValidatorResult {
  if (!/^[\w_\d]+$/.test(username)) {
    return Err('Username can only contain letters, "_" and numbers.');
  } else if (username.length < 3) {
    return Err('Username must be at least 3 characters.');
  } else if (username.length > 32) {
    return Err('Username must be at most 32 characters.');
  }
  return ok;
}

export function checkName(nickname: string): ValidatorResult {
  const NAME_MAX_LENGTH = 32;
  if (nickname.length === 0) {
    return Err('Empty name.');
  } else if (nickname.length > NAME_MAX_LENGTH) {
    return Err(`Name must be less than ${NAME_MAX_LENGTH} characters.`);
  }
  return ok;
}

export function checkPassword(password: string): ValidatorResult {
  const MIN_PASSWORD_LENGTH = 8;
  if (password.length < MIN_PASSWORD_LENGTH) {
    return Err(`Password must have at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  return ok;
}

export function checkChannelName(name: string): ValidatorResult {
  if (name.length < 2) {
    return Err('Channel name must be at least 2 characters.');
  } else if (name.length > 32) {
    return Err('Channel name must be at most 32 characters.');
  } else if (name.match(/\s/)) {
    return Err('Channel name cannot contain spaces.');
  }
  return ok;
}

export function checkMessage(text: string, entities: Entity[]): ValidatorResult {
  const MESSAGE_TEXT_MAX_LENGTH = 4096;
  if (text.length > MESSAGE_TEXT_MAX_LENGTH) {
    return Err('Message content too long.');
  } else if (text.trim().length === 0) {
    return Err('Empty message.');
  }
  try {
    if (entities.length > 1024) {
      return Err('Too much entities.');
    }
    let prevEnd = -1;
    for (const entity of entities) {
      const end = entity.start + entity.offset;
      if (text.length <= entity.start || entity.start < prevEnd || text.length < end) {
        return Err('Wrong entity properties.');
      }
      prevEnd = end;
    }
  } catch (e) {
    return Err('Wrong entities.');
  }
  return ok;
}
