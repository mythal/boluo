import { Message } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { Archive, Edit, EllipsisVertical, Trash } from '@boluo/icons';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { FC, forwardRef, ReactNode, useCallback, useId, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Spinner } from '@boluo/ui/Spinner';
import { useSetBanner } from '../../hooks/useBanner';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { MessageToolboxButton } from './MessageToolboxButton';
import { useIsDragging } from '../../hooks/useIsDragging';
import clsx from 'clsx';
import Icon from '@boluo/ui/Icon';

interface Props {
  self: boolean;
  iAmAdmin: boolean;
  iAmMaster: boolean;
  message: Message;
}

const Box = forwardRef<HTMLDivElement, { children: ReactNode; expanded: boolean }>(({ children, expanded }, ref) => (
  <div
    ref={ref}
    aria-expanded={expanded}
    className={clsx(
      'transition-colors duration-100',
      'bg-message-toolbox-bg text-highest/60 group-hover:text-highest flex items-stretch rounded text-base shadow',
      'aria-expanded:text-highest',
    )}
  >
    {children}
  </div>
));
Box.displayName = 'MessageToolboxBox';

const expandToolboxAtom = atom<string>('');

export const MessageToolbox: FC<Props> = ({ message, self, iAmAdmin, iAmMaster }) => {
  const isDragging = useIsDragging();
  const setBanner = useSetBanner();
  const boxRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const toolboxId = useId();
  const setExpandedId = useSetAtom(expandToolboxAtom);
  const expandedAtom = useMemo(() => atom((get) => get(expandToolboxAtom) === toolboxId), [toolboxId]);
  const expanded = useAtomValue(expandedAtom);
  const intl = useIntl();

  const handleDelete = async () => {
    setIsLoading(true);
    const MAX_LENGTH = 128;
    let { text } = message;
    if (text.length > MAX_LENGTH) {
      text = text.slice(0, MAX_LENGTH - 4) + '...';
    }
    const sure = window.confirm(
      intl.formatMessage({ defaultMessage: 'Are you sure to delete this message:' }) + `\n\n${text}`,
    );
    if (!sure) {
      setIsLoading(false);
      return;
    }
    const result = await post('/messages/delete', { id: message.id }, {});
    if (result.isErr) {
      const errorCode = result.err.code;
      setBanner({
        level: 'ERROR',
        content: <FormattedMessage defaultMessage="Failed to delete message ({ errorCode })" values={{ errorCode }} />,
      });
      return;
    } else {
      return;
    }
  };

  const handleArchiveMessage = useCallback(async () => {
    setIsLoading(true);
    await post('/messages/toggle_fold', { id: message.id }, {});
    setIsLoading(false);
  }, [message.id]);

  const handleEditMessage = useCallback(() => {
    dispatch({ type: 'editMessage', payload: { message } });
  }, [dispatch, message]);
  if (isDragging) return null;
  return (
    <Box ref={boxRef} expanded={expanded}>
      {isLoading ? (
        <MessageToolboxButton>
          <Spinner />
        </MessageToolboxButton>
      ) : (
        <>
          {(self || iAmAdmin) && (
            <MessageToolboxButton onClick={handleDelete}>
              <Icon icon={Trash} className="text-text-danger" />
            </MessageToolboxButton>
          )}
          {(self || iAmMaster) && (
            <MessageToolboxButton onClick={handleArchiveMessage} on={message.folded}>
              <Icon icon={Archive} />
            </MessageToolboxButton>
          )}
          {self && (
            <MessageToolboxButton onClick={handleEditMessage}>
              <Edit />
            </MessageToolboxButton>
          )}
        </>
      )}
    </Box>
  );
};
