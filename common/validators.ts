import { Entity } from './entities';

export function checkEmailFormat(email: string): boolean {
  // tslint:disable-next-line:max-line-length
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

export function checkUsername(username: string): [boolean, string] {
  if (!/^[\w_\d]+$/.test(username)) {
    return [false, 'Username can only contain letters, "_" and numbers.'];
  } else if (username.length < 3) {
    return [false, 'Username must be at least 3 characters.'];
  } else if (username.length > 32) {
    return [false, 'Username must be at most 32 characters.'];
  }
  return [true, ''];
}

export function checkNickname(nickname: string): [boolean, string] {
  const NICKNAME_MAX_CHARACTERS = 24;
  if (nickname.length === 0) {
    return [false, 'Empty nickname.'];
  } else if (nickname.length > NICKNAME_MAX_CHARACTERS) {
    return [false, `Nickname must be less than ${NICKNAME_MAX_CHARACTERS} characters.`];
  }
  return [true, ''];
}

export function checkPassword(password: string): [boolean, string] {
  const MIN_PASSWORD_LENGTH = 8;
  if (password.length < MIN_PASSWORD_LENGTH) {
    return [false, `Password must have at least ${MIN_PASSWORD_LENGTH} characters.`];
  }
  return [true, ''];
}

export function checkChannelName(name: string): [boolean, string] {
  if (!/^[\w_\d]+$/.test(name)) {
    return [false, 'Channel name can only contain letters, "_" and numbers.'];
  } else if (name.length < 3) {
    return [false, 'Channel name must be at least 3 characters.'];
  } else if (name.length > 32) {
    return [false, 'Channel name must be at most 32 characters.'];
  }
  return [true, ''];
}

export function checkChannelTitle(title: string): [boolean, string] {
  const TITLE_MAX_CHARACTERS = 24;
  if (title.length === 0) {
    return [false, 'Empty title.'];
  } else if (title.length > TITLE_MAX_CHARACTERS) {
    return [false, `Title must be less than ${TITLE_MAX_CHARACTERS} characters.`];
  }
  return [true, ''];
}

export function checkCharacterName(name: string): [boolean, string] {
  const CHARACTER_NAME_MAX_LENGTH = 64;
  if (name.length > CHARACTER_NAME_MAX_LENGTH) {
    return [false, 'Character name too long.'];
  }
  return [true, ''];
}

export function checkMessage(text: string, entities: Entity[]): [boolean, string] {
  const MESSAGE_TEXT_MAX_LENGTH = 4096;
  if (text.length > MESSAGE_TEXT_MAX_LENGTH) {
    return [false, 'Message content too long.'];
  } else if (text.trim().length === 0) {
    return [false, 'Empty message.'];
  }
  try {
    if (entities.length > 1024) {
      return [false, 'Too much entities.'];
    }
    let prevEnd = -1;
    for (const entity of entities) {
      const end = entity.start + entity.offset;
      if (text.length <= entity.start || entity.start < prevEnd || text.length < end) {
        return [false, 'Wrong entity properties.'];
      }
      prevEnd = end;
    }
  } catch (e) {
    return [false, 'Wrong entities.'];
  }
  return [true, ''];
}
