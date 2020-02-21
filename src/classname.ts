export type ClassName = string | ClassName[] | { [name: string]: boolean } | null | undefined | boolean;

export const classNames = (...xs: ClassName[]) => {
  const classNameList: string[] = [];
  for (const x of xs) {
    if (!x || x === true) {
      continue;
    }
    if (typeof x === 'string') {
      classNameList.push(x);
    } else if (Array.isArray(x)) {
      classNameList.push(classNames(...x));
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
