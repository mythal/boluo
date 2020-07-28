export const getDiceFace = (diceType: string): number => {
  const pattern = /^[dD](\d{1,3})$/;
  const match = diceType.match(pattern);
  if (match === null) {
    return 20;
  } else {
    return Number(match[1]);
  }
};
