import { type Theme } from 'react-select';

export const reactSelectTheme = (theme: Theme): Theme => ({
  borderRadius: 3,
  spacing: theme.spacing,
  colors: {
    primary: 'var(--color-legacy-brand-primary)',
    primary75: 'var(--color-legacy-select-primary-75)',
    primary50: 'var(--color-legacy-select-primary-50)',
    primary25: 'var(--color-legacy-select-primary-25)',
    danger: 'var(--color-legacy-red-800)',
    dangerLight: 'var(--color-legacy-red-600)',
    neutral0: 'var(--color-legacy-background)',
    neutral5: 'var(--color-legacy-select-neutral-5)',
    neutral10: 'var(--color-legacy-select-neutral-10)',
    neutral20: 'var(--color-legacy-select-neutral-20)',
    neutral30: 'var(--color-legacy-select-neutral-30)',
    neutral40: 'var(--color-legacy-select-neutral-40)',
    neutral50: 'var(--color-legacy-select-neutral-50)',
    neutral60: 'var(--color-legacy-select-neutral-60)',
    neutral70: 'var(--color-legacy-select-neutral-70)',
    neutral80: 'var(--color-legacy-select-neutral-80)',
    neutral90: 'var(--color-legacy-text)',
  },
});
