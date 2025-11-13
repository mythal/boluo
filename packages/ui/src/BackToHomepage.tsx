import { FormattedMessage } from 'react-intl';
import * as classes from './classes';

export const BackToHomepage = ({ url }: { url: string }) => {
  return (
    <a className={classes.link} href={url}>
      <span>
        <FormattedMessage defaultMessage="Back to Homepage" />
      </span>
    </a>
  );
};
