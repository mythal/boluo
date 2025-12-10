export type Theme = 'light' | 'dark' | 'graphite' | 'system';

export type ResolvedTheme = Exclude<Theme, 'system'>;
