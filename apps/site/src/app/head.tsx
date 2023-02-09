import logoDev from 'boluo-logo/png/logo-dev.png';
import logo from 'boluo-logo/png/logo.png';
import logoDevSvg from 'boluo-logo/svg/logo-dev.svg';
import logoSvg from 'boluo-logo/svg/logo.svg';
import { IS_DEVELOPMENT } from '../const';
import { getIntlSync } from '../helper/server';

export default function Head() {
  const intl = getIntlSync();
  return (
    <>
      <link rel="shortcut icon" href={IS_DEVELOPMENT ? logoDev.src : logo.src} key="icon" />
      <link
        rel="shortcut icon"
        href={IS_DEVELOPMENT ? logoDevSvg.src : logoSvg.src}
        type="image/svg+xml"
        key="icon-svg"
      />
      {/* <link rel="manifest" href="/site.webmanifest" type="application/manifest+json" key="manifest" /> */}
      <meta name="description" content="RPG tool, next generation" />
      <meta name="color-scheme" content="dark light" />
      <meta name="theme-color" content="#ffffff" />
      <title>{intl.formatMessage({ defaultMessage: 'Boluo ' })}</title>
    </>
  );
}
