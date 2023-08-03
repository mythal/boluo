import { Metadata } from 'next';
import type { ReactNode } from 'react';
import 'ui/tailwind.css';

export function generateMetadata(): Metadata {
  return {
    colorScheme: 'dark light',
  };
}

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
