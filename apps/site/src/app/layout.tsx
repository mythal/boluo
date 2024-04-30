import type { ReactNode } from 'react';
import '@boluo/ui/tailwind.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-text-base">{children}</body>
    </html>
  );
}
export const runtime = 'edge';
