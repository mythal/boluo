import { headers } from 'next/headers';

export default function Page() {
  return <span className="font-mono">{JSON.stringify(headers())}</span>;
}
