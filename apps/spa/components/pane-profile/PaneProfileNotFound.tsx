import User from '@boluo/icons/User';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { PaneHeaderBox } from '../PaneHeaderBox';

export const PaneProfileNotFound: FC = () => {
  return (
    <>
      <PaneHeaderBox icon={<User />}>
        <FormattedMessage defaultMessage="Not Found" />
      </PaneHeaderBox>
      <div className="p-4">
        <FormattedMessage defaultMessage="Not found" />
      </div>
    </>
  );
};
