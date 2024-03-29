import { Space } from '@boluo/api';
import { Plus } from '@boluo/icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { usePaneClose } from '../hooks/usePaneClose';
import { useSwitchSpace } from '../hooks/useSwitchSpace';
import { CreateSpaceForm } from './CreateSpaceForm';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';

interface Props {}

export const ChatCreateSpace: FC<Props> = () => {
  const switchSpace = useSwitchSpace();
  const onSuccess = (space: Space) => {
    switchSpace(space.id);
  };
  const close = usePaneClose();
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<Plus />}>
          <FormattedMessage defaultMessage="Create Space" />
        </PaneHeaderBox>
      }
    >
      <div className="relative">
        <CreateSpaceForm onSuccess={onSuccess} close={close} />
      </div>
    </PaneBox>
  );
};

export default ChatCreateSpace;
