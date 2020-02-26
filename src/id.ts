import { v1 as uuidV1 } from 'uuid';

export type Id = string;

export const newId = (): Id => uuidV1();
