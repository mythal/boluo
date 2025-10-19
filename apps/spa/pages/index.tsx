import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Redirector = () => {
  const router = useRouter();
  useEffect(() => {
    const locale = navigator.language.toLocaleLowerCase();
    const hash = location.hash;
    let subpath = '/en';
    if (locale.startsWith('ja')) {
      subpath = '/ja';
    } else if (locale.startsWith('zh-TW')) {
      subpath = '/zh-TW';
    } else if (locale.startsWith('zh')) {
      subpath = '/zh-CN';
    }

    void router.replace(`${subpath}${hash}`);
  }, [router]);
  return <div className="animate-pulse p-8">Redirecting...</div>;
};

export default function Page() {
  return (
    <>
      <Head>
        <title>Boluo Chat</title>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <meta
          name="description"
          content="A chat application designed specifically for playing RPGs."
        />
        <meta
          name="viewport"
          content="initial-scale=1, viewport-fit=cover, width=device-width"
        ></meta>
        <link rel="apple-touch-icon" href="/icons/app-180px.png"></link>
      </Head>
      <Redirector />
    </>
  );
}
