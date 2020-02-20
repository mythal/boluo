export const DEFAULT_TITLE = 'Boluo';

export const genTitle = (s: string) => `${s} - Boluo`;

export const setTitle = (s?: string) => {
  if (s) {
    document.title = genTitle(s);
  } else {
    document.title = DEFAULT_TITLE;
  }
};
