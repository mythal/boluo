export const palette = <T extends Record<string, string>>(colors: T): Record<keyof T, string> => {
  return colors;
};

export const revertPalette = <T extends Record<string, string>>(colors: T): Record<keyof T, string> => {
  const colorEntries: [number, string][] = Object.entries(colors).map(([key, value]) => [Number(key), value]);
  colorEntries.sort(([k1], [k2]) => k1 - k2);
  const keys = colorEntries.map(([key]) => String(key));
  const reversedKey = keys.reverse();
  const values = colorEntries.map(([, value]) => value);
  const reversed: Record<string, string> = {};
  reversedKey.forEach((key, index) => {
    const value = values[index];
    if (!value) {
      throw new Error('Unexpected empty value');
    }
    reversed[key] = value;
  });
  return reversed as Record<keyof T, string>;
};
