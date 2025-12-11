export type Theme = 'light' | 'dark' | 'graphite' | 'dusha' | 'system';

export type ResolvedTheme = Exclude<Theme, 'system'>;
