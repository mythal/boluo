import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Not Found - Boluo',
};

export default function NotFound() {
  return (
    <div className="bg-lowest mx-auto mt-20 flex flex-col gap-4 p-6 md:w-[20em]">
      <h2 className="text-4xl">Not Found</h2>

      <p className="">
        This page could not be found.{' '}
        <Link href="/" className="link">
          Back
        </Link>
      </p>
      <div className="font-pixel text-text-lighter text-center text-sm">(/ﾟДﾟ)/</div>
    </div>
  );
}
