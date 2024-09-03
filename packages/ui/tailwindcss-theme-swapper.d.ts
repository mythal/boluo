declare module 'tailwindcss-theme-swapper' {
  // Temporary fix for
  // https://github.com/crswll/tailwindcss-theme-swapper/issues/49
  import type { Config } from 'tailwindcss';

  type ConfigTheme = Config['theme'];

  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };

  interface BaseThemeConfig<B extends ConfigTheme> extends ThemeConfig<B> {
    name: 'base';
    theme: B;
  }

  interface ThemeConfig<B extends ConfigTheme> {
    name: string;
    selectors: string[];
    mediaQuery?: string;
    theme: DeepPartial<B>;
  }

  interface SwapperConfig<B extends ConfigTheme> {
    themes: [BaseThemeConfig<B>, ...ThemeConfig<B>[]];
  }

  // I'm not sure what this is supposed to return. You'd need to define the return type as well.
  type ThemeSwapper = <B extends ConfigTheme>(config: SwapperConfig<B>) => void;

  const themeSwapper: ThemeSwapper;
  export default themeSwapper;
}
