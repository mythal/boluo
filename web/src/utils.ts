export function randomWithSeed(str: string) {
  // https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (): number => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

const nameColorMap: { [name: string]: string } = {};

export const nameToHSL = (name: string): string => {
  if (nameColorMap[name]) {
    return nameColorMap[name];
  }
  const rng = randomWithSeed(name);
  const h = rng() % 365;
  const s = (rng() % 80) + 20;
  const l = (rng() % 15) + (rng() % 15) + (rng() % 15) + (rng() % 10);
  const color = `hsl(${h}, ${s}%, ${l}%)`;
  nameColorMap[name] = color;
  return color;
};

export const leadingZero = (n: number, width: number = 2, char: string = '0'): string => {
  let s = n.toString();
  const len = s.length;
  if (len < width) {
    s = char.repeat(width - len) + s;
  }
  return s;
};
