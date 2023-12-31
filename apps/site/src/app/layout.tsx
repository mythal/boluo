import type { ReactNode } from 'react';
import 'ui/tailwind.css';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
