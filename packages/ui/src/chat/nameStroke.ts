import { computeTextStroke, mixHexColors } from '@boluo/color';
import { type ResolvedTheme } from '@boluo/types';
import { type CSSProperties } from 'react';

interface ThemeStrokeSurfaces {
  name: { color: string; opacity: number };
  message: { inGame: string; outOfGame: string };
  pane: string;
}

const mix = (first: string, second: string, firstWeight = 0.5): string =>
  mixHexColors(first, second, firstWeight) ?? second;

// These resolve the corresponding Tailwind and theme.tailwind.css tokens to sRGB.
// Keeping them here lets the hot render path remain synchronous and independent of the DOM.
const themeStrokeSurfaces: Record<ResolvedTheme, ThemeStrokeSurfaces> = {
  light: {
    name: { color: '#E5E5E5', opacity: 0.35 },
    message: { inGame: '#FBFDF6', outOfGame: '#FFFFFF' },
    pane: '#FFFFFF',
  },
  dusha: {
    name: { color: '#DCE8D4', opacity: 0.5 },
    message: { inGame: '#F4F8F0', outOfGame: '#FCFDF9' },
    pane: '#FCFDF9',
  },
  dark: {
    name: { color: '#525252', opacity: 0.35 },
    message: { inGame: '#2D3748', outOfGame: '#1A202C' },
    pane: '#1A202C',
  },
  graphite: {
    name: { color: '#525252', opacity: 0.35 },
    message: {
      inGame: '#3F3F46',
      outOfGame: mix('#27272A', '#3F3F46', 0.75),
    },
    pane: mix('#27272A', '#3F3F46', 0.75),
  },
};

const createNameBoxStrokeBackgrounds = (
  themeSurfaces: ThemeStrokeSurfaces,
  messageSurface: string,
): readonly string[] => [mix(themeSurfaces.name.color, messageSurface, themeSurfaces.name.opacity)];

// Resolve all translucent name/message surface combinations once at module initialization.
const nameBoxStrokeBackgrounds: Record<
  ResolvedTheme,
  { inGame: readonly string[]; outOfGame: readonly string[] }
> = {
  light: {
    inGame: createNameBoxStrokeBackgrounds(
      themeStrokeSurfaces.light,
      themeStrokeSurfaces.light.message.inGame,
    ),
    outOfGame: createNameBoxStrokeBackgrounds(
      themeStrokeSurfaces.light,
      themeStrokeSurfaces.light.message.outOfGame,
    ),
  },
  dusha: {
    inGame: createNameBoxStrokeBackgrounds(
      themeStrokeSurfaces.dusha,
      themeStrokeSurfaces.dusha.message.inGame,
    ),
    outOfGame: createNameBoxStrokeBackgrounds(
      themeStrokeSurfaces.dusha,
      themeStrokeSurfaces.dusha.message.outOfGame,
    ),
  },
  dark: {
    inGame: createNameBoxStrokeBackgrounds(
      themeStrokeSurfaces.dark,
      themeStrokeSurfaces.dark.message.inGame,
    ),
    outOfGame: createNameBoxStrokeBackgrounds(
      themeStrokeSurfaces.dark,
      themeStrokeSurfaces.dark.message.outOfGame,
    ),
  },
  graphite: {
    inGame: createNameBoxStrokeBackgrounds(
      themeStrokeSurfaces.graphite,
      themeStrokeSurfaces.graphite.message.inGame,
    ),
    outOfGame: createNameBoxStrokeBackgrounds(
      themeStrokeSurfaces.graphite,
      themeStrokeSurfaces.graphite.message.outOfGame,
    ),
  },
};

export type NameStrokeSurface =
  { type: 'name-box'; inGame: boolean } | { type: 'pane' } | { type: 'solid'; color: string };

const NAME_STROKE_CACHE_LIMIT = 512;
const nameStrokeStyleCache = new Map<string, CSSProperties>();
const emptyNameStrokeStyle = {
  '--name-color': undefined,
  '--name-stroke': '0 transparent',
} as CSSProperties;

const getSurfaceCacheKey = (surface: NameStrokeSurface): string => {
  switch (surface.type) {
    case 'name-box':
      return surface.inGame ? 'name-box:in-game' : 'name-box:out-of-game';
    case 'pane':
      return 'pane';
    case 'solid':
      return `solid:${surface.color}`;
  }
};

export const getNameStrokeStyle = (
  color: string | undefined,
  theme: ResolvedTheme,
  surface: NameStrokeSurface,
): CSSProperties => {
  if (color == null) return emptyNameStrokeStyle;
  const cacheKey = `${color}|${theme}|${getSurfaceCacheKey(surface)}`;
  const cached = nameStrokeStyleCache.get(cacheKey);
  if (cached != null) return cached;

  const toStroke = (backgrounds: readonly string[]): string => {
    const stroke = computeTextStroke(color, backgrounds);
    if (stroke == null || stroke.strength === 0) return '0 transparent';
    return `3px ${stroke.color}`;
  };
  const defaultStroke =
    surface.type === 'name-box'
      ? toStroke(
          surface.inGame
            ? nameBoxStrokeBackgrounds[theme].inGame
            : nameBoxStrokeBackgrounds[theme].outOfGame,
        )
      : toStroke([surface.type === 'solid' ? surface.color : themeStrokeSurfaces[theme].pane]);
  const result = {
    '--name-color': color,
    '--name-stroke': defaultStroke,
  } as CSSProperties;
  if (nameStrokeStyleCache.size >= NAME_STROKE_CACHE_LIMIT) {
    const oldestKey = nameStrokeStyleCache.keys().next().value;
    if (oldestKey != null) nameStrokeStyleCache.delete(oldestKey);
  }
  nameStrokeStyleCache.set(cacheKey, result);
  return result;
};
