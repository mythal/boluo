'use client';

import { useEffect } from 'react';

export const Redirector = () => {
  useEffect(() => {
    const locale = navigator.language.toLocaleLowerCase();
    const hash = location.hash;
    let subpath = '/en';
    if (locale.startsWith('ja')) {
      subpath = '/ja';
    } else if (locale.startsWith('zh')) {
      subpath = '/zh-CN';
    }

    location.href = `${subpath}${hash}`;
  }, []);
  return <div className="animate-pulse p-8">Redirecting...</div>;
};
