import '@boluo/tailwind-config';

import type { AppProps } from 'next/app';

export default function SpaApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
