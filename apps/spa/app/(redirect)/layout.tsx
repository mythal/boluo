import type { ReactNode } from 'react';
import '@boluo/ui/tailwind.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boluo Chat',
  description: 'A chat application designed specifically for playing RPGs.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="" className="bg-bg text-text-base">
      <body>{children}</body>
    </html>
  );
}
