import type { RenderOptions } from '@testing-library/react';
import { render as jestRender } from '@testing-library/react';
import type { FC, ReactElement } from 'react';
import { IntlProvider } from 'react-intl';

// See https://testing-library.com/docs/react-testing-library/setup#custom-render
const AllTheProviders: FC<{ children: React.ReactNode }> = ({ children }) => {
  return <IntlProvider locale="en">{children}</IntlProvider>;
};
export const render = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>): ReturnType<typeof jestRender> =>
  jestRender(ui, { wrapper: AllTheProviders, ...options });
