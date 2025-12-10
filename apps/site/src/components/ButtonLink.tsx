import NextLink, { type LinkProps } from 'next/link';
import { type ReactNode } from 'react';

interface Props extends LinkProps {
  children: ReactNode;
}

export function ButtonLink({ href, children }: Props) {
  return (
    <NextLink
      href={href}
      className="border-border-default text-text-link hover:border-border-strong hover:bg-surface-interactive-hover hover:text-text-link-hover inline-flex items-center rounded-sm border px-2 py-1"
    >
      {children}
    </NextLink>
  );
}
