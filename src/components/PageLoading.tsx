import React, { useRef } from 'react';
import { useLottie } from '../hooks';
// https://lottiefiles.com/3357-paper
import paper from './paper.json';
import { cls } from '../utils';

interface Props {
  className?: string;
}

function PageLoading({ className }: Props) {
  const container = useRef<HTMLDivElement | null>(null);
  useLottie(container, paper);
  return <div className={cls('w-32 h-32', className)} ref={container} />;
}

export default React.memo(PageLoading);
