import { getOS } from '@boluo/utils';
import { FormattedMessage } from 'react-intl';

export const UnsupportedBrowser = () => {
  const isIos = getOS() === 'iOS';
  return (
    <div className="max-w-md p-8">
      <h1 className="pb-4 text-xl">
        <FormattedMessage defaultMessage="Your browser is not supported" />
      </h1>
      <p className="py-2">
        <FormattedMessage defaultMessage="This application requires many modern features that are not supported by your browser." />{' '}
        <a href="https://caniuse.com/css-container-queries" target="_blank" rel="noreferrer" className="underline">
          <FormattedMessage defaultMessage="Such as CSS Container Queries." />
        </a>
      </p>
      {isIos ? (
        <p className="py-2">
          <FormattedMessage defaultMessage="Please upgrade your iOS/iPadOS to the latest version to use this application." />
        </p>
      ) : (
        <p className="py-2">
          <FormattedMessage defaultMessage="We recommend using the latest version of Chrome, Firefox, or Edge to use this application." />
        </p>
      )}
    </div>
  );
};
