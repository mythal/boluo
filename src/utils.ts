import { v1 as uuidV1 } from 'uuid';

export type Id = string;

export const newId = (): Id => uuidV1();

export const lastSeenIsOnline = (timestamp?: number): boolean => {
  return timestamp !== undefined && new Date().getDate() - timestamp < 5000;
};

export type ClassName =
  | string
  | ClassName[]
  | { [name: string]: boolean | undefined | null }
  | null
  | undefined
  | boolean;

export const cls = (...xs: ClassName[]) => {
  const classNameList: string[] = [];
  for (const x of xs) {
    if (!x || x === true) {
      continue;
    }
    if (typeof x === 'string') {
      classNameList.push(x);
    } else if (Array.isArray(x)) {
      classNameList.push(cls(...x));
    } else {
      for (const entry of Object.entries(x)) {
        if (entry[1]) {
          classNameList.push(entry[0]);
        }
      }
    }
  }
  return classNameList.join(' ');
};
