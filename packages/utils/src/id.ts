import { v1 as makeId, validate } from 'uuid';

export type Id = string;

export const isUuid = (x: unknown): x is string => typeof x === 'string' && validate(x);

export { makeId };
