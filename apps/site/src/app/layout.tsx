import type { ReactNode } from 'react';
import '@boluo/tailwind-config';

export default function RootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
