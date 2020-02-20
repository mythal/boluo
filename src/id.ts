const uuidV1 = require('uuid/v1');

export type Id = string;

export const newId = (): Id => uuidV1();
