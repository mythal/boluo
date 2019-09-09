export const uuid1 = require('uuid/v1');

export const generateId = (): string => uuid1();

const argon2 = require('argon2');

export const passwordHash = (password: string): Promise<string> => {
  return argon2.hash(password, { timeCost: 4, memoryCost: 512, parallelism: 8, type: argon2.argon2d });
};

export const passwordVerify = (hash: string, password: string): Promise<boolean> => {
  return argon2.verify(hash, password);
};
