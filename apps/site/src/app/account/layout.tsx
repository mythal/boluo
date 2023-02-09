import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen items-start justify-center pt-[20vh]">
      <div className="min-w-[20rem] max-w-[90vw] rounded border bg-lowest p-6 shadow-1 shadow-gray-300/75">
        {children}
      </div>
    </div>
  );
}
