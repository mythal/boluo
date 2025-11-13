import { FormattedMessage } from 'react-intl';
import { BackToHomepage } from './BackToHomepage';
import * as classes from './classes';

export const UnsupportedBrowser = ({
  isIos,
  siteUrl,
}: {
  isIos: boolean;
  siteUrl?: string | undefined | null;
}) => {
  const chromeLink = (
    <a
      key="chromeLink"
      href="https://www.google.com/chrome/"
      target="_blank"
      rel="noreferrer"
      className={classes.link}
    >
      Chrome
    </a>
  );
  const firefoxLink = (
    <a
      key="firefoxLink"
      href="https://www.mozilla.org/firefox/"
      target="_blank"
      rel="noreferrer"
      className={classes.link}
    >
      Firefox
    </a>
  );
  const edgeLink = (
    <a
      key="edgeLink"
      href="https://www.microsoft.com/edge"
      target="_blank"
      rel="noreferrer"
      className={classes.link}
    >
      Edge
    </a>
  );
  return (
    <div className="text-text-primary max-w-md p-8">
      <h1 className="pb-4 text-xl">
        <FormattedMessage defaultMessage="Your browser is not supported" />
      </h1>
      <p className="py-2">
        <FormattedMessage defaultMessage="This application requires many modern features that are not supported by your browser." />{' '}
        <a
          href="https://caniuse.com/css-container-queries"
          target="_blank"
          rel="noreferrer"
          className={classes.link}
        >
          <FormattedMessage defaultMessage="Such as CSS Container Queries." />
        </a>
      </p>
      {isIos ? (
        <p className="py-2">
          <FormattedMessage defaultMessage="To use this app, please upgrade your iOS/iPadOS version to 16 or above." />
        </p>
      ) : (
        <p className="py-2">
          <FormattedMessage
            defaultMessage="We recommend using the latest version of {chromeLink}, {firefoxLink}, or {edgeLink} to use this application."
            values={{ chromeLink, firefoxLink, edgeLink }}
          />
        </p>
      )}

      {siteUrl && (
        <p className="py-4">
          <BackToHomepage url={siteUrl} />
        </p>
      )}
    </div>
  );
};
