import { type Metadata } from 'next';
import Link from 'next/link';
import * as classes from '@boluo/ui/classes';

export const metadata: Metadata = {
  title: 'Not Found - Boluo',
};

export default function NotFound() {
  return (
    <html lang="en">
      <body className="bg-bg text-text-base">
        <div className="bg-card-bg border-card-border shadow-1/2 shadow-card-shadow mx-auto mt-20 flex flex-col gap-4 border p-6 md:w-[20em]">
          <h2 className="text-4xl">Not Found</h2>

          <p className="">
            This page could not be found.{' '}
            <Link href="/" className={classes.link}>
              Back
            </Link>
          </p>
          <div className="font-pixel text-text-lighter text-center text-sm">(/ﾟДﾟ)/</div>
        </div>
      </body>
    </html>
  );
}
