import { hsl } from 'polished';
import type Prando from 'prando';

export const getDiceFace = (diceType: string): number => {
  const pattern = /^[dD](\d{1,3})$/;
  const match = pattern.exec(diceType);
  if (match == null) {
    return 20;
  } else {
    return Number(match[1]);
  }
};

export const chatName = (
  characterName: string | undefined | null,
  nickname?: string,
): string | undefined => {
  if (characterName && characterName.length > 0) {
    return characterName;
  }
  return nickname;
};

export function genColor(rng: Prando, lightnessDelta = 0.0): string {
  return hsl(rng.next(0, 365), rng.next(), rng.next(0.5, 0.8) + lightnessDelta);
}
