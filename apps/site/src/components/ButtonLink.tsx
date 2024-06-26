import NextLink, { LinkProps } from 'next/link';
import { ReactNode } from 'react';

interface Props extends LinkProps {
  children: ReactNode;
}

export function ButtonLink({ href, children }: Props) {
  return (
    <NextLink
      href={href}
      className="border-surface-200 inline-flex items-center rounded-sm border px-2 py-1 text-blue-700 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-500"
    >
      {children}
    </NextLink>
  );
}
