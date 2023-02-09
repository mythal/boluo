declare module '*.svg' {
  import type { StaticImageData } from 'next/dist/client/image';

  const content: StaticImageData;

  export default content;
}
