import Prando from 'prando';

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  // Normalize h to 0-360 range
  h = h % 360;
  if (h < 0) h += 360;
  h = h / 360;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  if (s === 0) {
    return [l, l, l];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);

  return [r, g, b];
}

// Create HSLA color and convert to hex
function hsla(
  h: number,
  s: number,
  l: number,
  a: number,
): { r: number; g: number; b: number; a: number } {
  const [r, g, b] = hslToRgb(h, s, l);
  return { r, g, b, a };
}

// Convert RGB to hexadecimal string
function toHex(color: { r: number; g: number; b: number; a?: number }): string {
  const toHexByte = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.padStart(2, '0');
  };

  return `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}`;
}

// References:
// - https://pico-8.fandom.com/wiki/Palette
export const palette = {
  basic: {
    light: '#000000',
    dark: '#ffffff',
  },
  blue: {
    light: '#1D2B53',
    dark: '#29ADFF',
  },
  red: {
    light: '#FF3366',
    dark: '#ff999d',
  },
  green: {
    light: '#008751',
    dark: '#00E436',
  },
  yellow: {
    light: '#969600',
    dark: '#fcffa9',
  },
  grey: {
    light: '#5F574F',
    dark: '#C2C3C7',
  },
};

export type PaletteKey = keyof typeof palette;

export const paletteKeys = Object.keys(palette) as Array<PaletteKey>;

export const parseHexColor = (color: string): string | null => {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color;
  }
  return null;
};

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const hexToRgb = (color: string): RgbColor | null => {
  const parsed = parseHexColor(color);
  if (parsed == null) return null;
  return {
    r: Number.parseInt(parsed.slice(1, 3), 16) / 255,
    g: Number.parseInt(parsed.slice(3, 5), 16) / 255,
    b: Number.parseInt(parsed.slice(5, 7), 16) / 255,
  };
};

const srgbChannelToLinear = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

/** WCAG relative luminance for an sRGB hex color. */
export const relativeLuminance = (color: string): number | null => {
  const rgb = hexToRgb(color);
  if (rgb == null) return null;
  return (
    0.2126 * srgbChannelToLinear(rgb.r) +
    0.7152 * srgbChannelToLinear(rgb.g) +
    0.0722 * srgbChannelToLinear(rgb.b)
  );
};

/** WCAG contrast ratio between two opaque sRGB hex colors. */
const contrastFromLuminances = (first: number, second: number): number => {
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
};

export const contrastRatio = (first: string, second: string): number | null => {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  if (firstLuminance == null || secondLuminance == null) return null;
  return contrastFromLuminances(firstLuminance, secondLuminance);
};

const rgbToHex = ({ r, g, b }: RgbColor): string => {
  const channelToHex = (channel: number) =>
    Math.round(Math.max(0, Math.min(1, channel)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`.toUpperCase();
};

/** Mix two opaque hex colors in sRGB, matching CSS `color-mix(in srgb, ...)`. */
export const mixHexColors = (first: string, second: string, firstWeight = 0.5): string | null => {
  const firstRgb = hexToRgb(first);
  const secondRgb = hexToRgb(second);
  if (firstRgb == null || secondRgb == null) return null;
  const weight = Math.max(0, Math.min(1, firstWeight));
  return rgbToHex({
    r: firstRgb.r * weight + secondRgb.r * (1 - weight),
    g: firstRgb.g * weight + secondRgb.g * (1 - weight),
    b: firstRgb.b * weight + secondRgb.b * (1 - weight),
  });
};

export interface TextStroke {
  color: '#000000' | '#FFFFFF';
  strength: number;
  contrast: number;
}

export const DEFAULT_TEXT_STROKE_CONTRAST = 2.2;

/**
 * Find the least legible supplied background and return a black/white stroke for it.
 * The strength increases smoothly as foreground/background contrast falls below the target.
 */
export const computeTextStroke = (
  foreground: string,
  backgrounds: readonly string[],
  targetContrast = DEFAULT_TEXT_STROKE_CONTRAST,
): TextStroke | null => {
  const foregroundLuminance = relativeLuminance(foreground);
  if (foregroundLuminance == null || backgrounds.length === 0) return null;

  let minimumContrast = Number.POSITIVE_INFINITY;
  let criticalBackgroundLuminance: number | null = null;
  for (const background of backgrounds) {
    const backgroundLuminance = relativeLuminance(background);
    if (backgroundLuminance != null) {
      const ratio = contrastFromLuminances(foregroundLuminance, backgroundLuminance);
      if (ratio >= minimumContrast) continue;
      minimumContrast = ratio;
      criticalBackgroundLuminance = backgroundLuminance;
    }
  }
  if (criticalBackgroundLuminance == null) return null;

  const contrastRange = Math.max(targetContrast - 1, Number.EPSILON);
  const contrastDeficit = Math.max(0, targetContrast - minimumContrast) / contrastRange;
  const strength = Math.min(1, contrastDeficit);

  const scoreStroke = (strokeLuminance: 0 | 1): number =>
    Math.min(
      contrastFromLuminances(strokeLuminance, foregroundLuminance),
      contrastFromLuminances(strokeLuminance, criticalBackgroundLuminance),
    );
  const blackScore = scoreStroke(0);
  const whiteScore = scoreStroke(1);

  return {
    color: blackScore >= whiteScore ? '#000000' : '#FFFFFF',
    strength,
    contrast: minimumContrast,
  };
};

const isColorPart = (color: string): boolean => {
  if (parseHexColor(color) != null) return true;
  if (color.startsWith(PALETTE_PREFIX)) {
    return paletteKeys.includes(color.slice(PALETTE_PREFIX.length) as PaletteKey);
  }
  return color.startsWith(RANDOM_PREFIX) && color.length > RANDOM_PREFIX.length;
};

export const isGameColor = (color: string): boolean => {
  if (color === '') return true;
  const parts = color.split(';');
  return parts.length <= 2 && parts.every(isColorPart);
};

export function generateColor(seed: string, lightnessDelta = 0.0): string {
  const rng = new Prando(seed);
  const h = rng.next(0, 365);
  const s = rng.next();
  const l = rng.next(0.5, 0.8) + lightnessDelta;
  const color = hsla(h, s, l, 1);
  return toHex(color).toUpperCase();
}

export const PALETTE_PREFIX = 'palette:';
export const RANDOM_PREFIX = 'seed:';

export type RandomColor = { type: 'random'; seed: string };
export type PaletteColor = { type: 'palette'; key: PaletteKey };
export type HexColor = { type: 'hex'; color: string };
export type GameColor = RandomColor | PaletteColor | HexColor;
export type ByTheme<T> = { light: T; dark: T };

export const parseColorPart = (color: string): GameColor => {
  if (color.startsWith(PALETTE_PREFIX)) {
    const key = color.slice(PALETTE_PREFIX.length) as PaletteKey;
    if (paletteKeys.includes(key)) {
      return { type: 'palette', key };
    }
    return { type: 'random', seed: '' };
  } else if (color.startsWith(RANDOM_PREFIX)) {
    return { type: 'random', seed: color.slice(RANDOM_PREFIX.length) };
  }
  const hexColor = parseHexColor(color);
  if (hexColor != null) {
    return { type: 'hex', color: hexColor };
  }
  return { type: 'random', seed: '' };
};

export const parseGameColor = (color: string): ByTheme<GameColor> => {
  const colors = color.split(';');
  switch (colors.length) {
    case 0:
      return { dark: { type: 'random', seed: '' }, light: { type: 'random', seed: '' } };
    case 1: {
      const parsedColor = parseColorPart(colors[0]!);
      return { dark: parsedColor, light: parsedColor };
    }
    default:
      return { light: parseColorPart(colors[0]!), dark: parseColorPart(colors[1]!) };
  }
};

const computeColor = (userId: string, color: GameColor, theme: 'light' | 'dark'): string => {
  switch (color.type) {
    case 'hex':
      return color.color.toUpperCase();
    case 'palette':
      return palette[color.key][theme];
    case 'random':
      return generateColor(userId + color.seed, theme === 'light' ? 0.0 : 0.1);
    default:
      return generateColor(userId, theme === 'light' ? 0.0 : 0.1);
  }
};

export const computeColors = (userId: string, colors: ByTheme<GameColor>): ByTheme<string> => {
  return {
    light: computeColor(userId, colors.light, 'light'),
    dark: computeColor(userId, colors.dark, 'dark'),
  };
};
