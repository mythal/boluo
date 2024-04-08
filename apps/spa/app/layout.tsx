import { Metadata } from 'next';
import '@boluo/ui/tailwind.css';

export const metadata: Metadata = {
  title: 'Boluo',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="" className="bg-bg text-text-base">
      <body>{children}</body>
    </html>
  );
}
