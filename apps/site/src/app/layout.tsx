import type { ReactNode } from 'react';
import '@boluo/ui/tailwind.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export const runtime = 'edge';
