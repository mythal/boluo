import Avatar from 'boring-avatars';
import type { ComponentProps } from 'react';
import glyphCatalog from './glyphs.json';

interface AvatarGlyph {
  readonly paths: readonly string[];
  readonly symbol: string;
}

const AVATAR_GLYPHS = glyphCatalog.glyphs satisfies readonly AvatarGlyph[];

export const AVATAR_SYMBOLS: readonly string[] = AVATAR_GLYPHS.map(({ symbol }) => symbol);
export type AvatarSymbol = string;

const FALLBACK_COLORS = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'];
const CENTERED_VARIATION_SAMPLES = 4;
const MAX_SYMBOL_OFFSET = 5;
const MAX_SYMBOL_ROTATION = 12;
const MAX_SYMBOL_SCALE_VARIATION = 0.12;
const COLOR_PALETTES: readonly string[][] = [
  FALLBACK_COLORS,
  ['#FF006E', '#FB5607', '#FFBE0B', '#3A86FF', '#8338EC'],
  ['#03045E', '#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8'],
  ['#132A13', '#31572C', '#4F772D', '#90A955', '#ECF39E'],
  ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'],
  ['#590D22', '#800F2F', '#A4133C', '#C9184A', '#FF4D6D'],
  ['#582F0E', '#7F4F24', '#936639', '#A68A64', '#B6AD90'],
  ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF'],
  ['#10002B', '#3C096C', '#7B2CBF', '#C77DFF', '#E0AAFF'],
  ['#001219', '#005F73', '#0A9396', '#EE9B00', '#AE2012'],
];

type AvatarVariant = NonNullable<ComponentProps<typeof Avatar>['variant']>;

const AVATAR_VARIANTS = [
  'marble',
  'beam',
  'pixel',
  'sunset',
  'ring',
  'bauhaus',
] as const satisfies readonly AvatarVariant[];

export interface GeneratedAvatarProps {
  name: string;
  size: number | string;
}

export interface SymbolAvatarProps extends GeneratedAvatarProps {
  symbol?: AvatarSymbol;
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function getRelativeLuminance(color: string): number {
  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const red = toLinear(Number.parseInt(color.slice(1, 3), 16));
  const green = toLinear(Number.parseInt(color.slice(3, 5), 16));
  const blue = toLinear(Number.parseInt(color.slice(5, 7), 16));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getColors(name: string): string[] {
  const paletteSeed = hashString(`palette:${name}`);
  return COLOR_PALETTES[paletteSeed % COLOR_PALETTES.length] ?? FALLBACK_COLORS;
}

function getCenteredVariation(name: string, dimension: string, maximum: number): number {
  let total = 0;
  for (let index = 0; index < CENTERED_VARIATION_SAMPLES; index += 1) {
    total += hashString(`${dimension}:${index}:${name}`) / 0xffffffff;
  }
  const centeredAverage = (total / CENTERED_VARIATION_SAMPLES - 0.5) * 2;
  return Number((centeredAverage * maximum).toFixed(2));
}

export function SymbolAvatar({ name, size, symbol: requestedSymbol }: SymbolAvatarProps) {
  const symbolSeed = hashString(`symbol:${name}`);
  const backgroundSeed = hashString(`symbol-background:${name}`);
  const colors = getColors(name);
  const requestedSymbolIndex =
    requestedSymbol === undefined ? -1 : AVATAR_SYMBOLS.indexOf(requestedSymbol);
  const symbolIndex =
    requestedSymbolIndex >= 0 ? requestedSymbolIndex : symbolSeed % AVATAR_SYMBOLS.length;
  const glyph = AVATAR_GLYPHS[symbolIndex];
  const symbol = glyph?.symbol ?? 'Δ';
  const glyphPathSeed = hashString(`symbol-path:${name}`);
  const glyphPaths = glyph?.paths ?? [];
  const glyphPath = glyphPaths[glyphPathSeed % glyphPaths.length] ?? '';
  const background = colors[backgroundSeed % colors.length] ?? FALLBACK_COLORS[0] ?? '#92A1C6';
  const foreground = getRelativeLuminance(background) > 0.179 ? '#111827' : '#FFFFFF';
  const offsetX = getCenteredVariation(name, 'symbol-offset-x', MAX_SYMBOL_OFFSET);
  const offsetY = getCenteredVariation(name, 'symbol-offset-y', MAX_SYMBOL_OFFSET);
  const rotation = getCenteredVariation(name, 'symbol-rotation', MAX_SYMBOL_ROTATION);
  const scaleVariation = getCenteredVariation(name, 'symbol-scale', MAX_SYMBOL_SCALE_VARIATION);
  const glyphScale = Number((1 + scaleVariation).toFixed(2));
  const glyphTransform = `translate(${offsetX} ${offsetY}) rotate(${rotation} 50 50) translate(50 50) scale(${glyphScale}) translate(-50 -50)`;

  return (
    <svg
      aria-label={`Generated symbol avatar for ${name}`}
      data-avatar-kind="symbol"
      data-avatar-symbol={symbol}
      height={size}
      role="img"
      viewBox="0 0 100 100"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill={background} height="100" width="100" />
      <path d={glyphPath} fill={foreground} transform={glyphTransform} />
    </svg>
  );
}

export function GeneratedAvatar({ name, size }: GeneratedAvatarProps) {
  // Salt each dimension so the category and palette do not move in lockstep.
  const categorySeed = hashString(`category:${name}`);
  const colors = getColors(name);
  const category = categorySeed % (AVATAR_VARIANTS.length + 1);

  if (category === AVATAR_VARIANTS.length) {
    return <SymbolAvatar name={name} size={size} />;
  }

  const variant = AVATAR_VARIANTS[category] ?? 'marble';

  return <Avatar colors={colors} name={name} size={size} square variant={variant} />;
}
