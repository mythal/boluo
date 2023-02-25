export const shuffle = <T>(array: Array<T>): void => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j]!;
    array[j] = temp!;
  }
};
export const selectRandom = <T>(array: Array<T>): T => {
  return array[Math.floor(Math.random() * array.length)]!;
};
