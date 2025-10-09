import type { ReactNode } from 'react';
import '@boluo/tailwind-config';

export default function RootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// Ensure all server-rendered routes use the Edge Runtime
// https://developers.cloudflare.com/pages/framework-guides/nextjs/ssr/get-started/
// export const runtime = 'edge';
// Disable due to the site is no longer using the Cloudflare Pages
