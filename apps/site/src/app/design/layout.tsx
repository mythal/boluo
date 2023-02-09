import Link from 'next/link';
import type { ReactNode } from 'react';
import { Footer } from './Footer';

export default function DesignLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="p-4">
      <header className="my-2">
        <ul className="flex justify-center gap-2 [&>li>a]:p-2">
          <li>
            <Link href="/design">Intro</Link>
          </li>
          <li>
            <Link href="/design/button">Button</Link>
          </li>
          <li>
            <Link href="/design/form">Form</Link>
          </li>
        </ul>
      </header>
      <div>{children}</div>
      <div>
        <Footer />
      </div>
    </div>
  );
}
