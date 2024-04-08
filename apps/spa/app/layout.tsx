import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boluo',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
