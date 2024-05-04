export const DEFAULT_DICE_FACE = 20;
const diceFaceClamp = (value: number): number => {
  if (Number.isNaN(value)) {
    return DEFAULT_DICE_FACE;
  }
  return Math.min(Math.max(Math.floor(value), 2), 65536);
};

export const parseDiceFace = (faceType: unknown): number => {
  if (typeof faceType === 'string') {
    let face = faceType.toLowerCase();
    if (face.startsWith('d') && face.length > 1) {
      face = face.slice(1);
    }
    if (/^\d{1,5}$/.test(face)) {
      return diceFaceClamp(parseInt(face, 10));
    }
  } else if (typeof faceType === 'number') {
    return diceFaceClamp(faceType);
  }
  return DEFAULT_DICE_FACE;
};
