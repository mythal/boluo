import { User } from '@boluo/icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { ClosePaneButton } from '../ClosePaneButton';
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
