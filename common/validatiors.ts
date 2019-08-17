export function checkEmailFormat(email: string): boolean {
  // tslint:disable-next-line:max-line-length
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

export function checkUsername(username: string): [boolean, string] {
  if (/^[\w_\d]+$/.test(username)) {
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
