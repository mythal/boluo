import { FormattedMessage } from 'react-intl';
import { FloatingBox } from '../FloatingBox';

export const UserCardLoading = () => {
  return (
    <FloatingBox className="p-3">
      <div>
        <FormattedMessage defaultMessage="Loading user information..." />
      </div>
    </FloatingBox>
  );
};
