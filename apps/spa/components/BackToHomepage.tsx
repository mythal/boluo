import { SITE_URL } from '../const';
import { FormattedMessage } from 'react-intl';
import * as classes from '@boluo/ui/classes';

export const BackToHomepage = () => {
  if (!SITE_URL) return null;
  return (
    <a className={classes.link} href={SITE_URL}>
      <span>
        <FormattedMessage defaultMessage="Back to Homepage" />
      </span>
    </a>
  );
};
