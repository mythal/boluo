import { FormattedMessage } from 'react-intl';
import { FloatingBox } from '../FloatingBox';

export const UserCardError = () => {
  return (
    <FloatingBox className="p-3">
      <div>
        <FormattedMessage defaultMessage="Failed to load user information." />
      </div>
    </FloatingBox>
  );
};
