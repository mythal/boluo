import NextLink from 'next/link';
import { ReactNode } from 'react';

interface Props {
  href: string;
  children: ReactNode;
}

export function Link({ href, children }: Props) {
  return (
    <NextLink
      href={href}
      className="inline-flex items-center border border-surface-200 hover:border-blue-300 text-blue-700 hover:text-blue-500 py-1 px-2 hover:bg-blue-100 rounded-sm"
    >
      {children}
    </NextLink>
  );
}
