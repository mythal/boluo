import { Message } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { Archive, Edit, EllipsisVertical, Trash, X } from '@boluo/icons';
import { useSetAtom } from 'jotai';
import { FC, forwardRef, ReactNode, useCallback, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Spinner } from '@boluo/ui/Spinner';
import { useSetBanner } from '../../hooks/useBanner';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useOutside } from '../../hooks/useOutside';
import { MessageToolboxButton } from './MessageToolboxButton';
import { useIsDragging } from '../../hooks/useIsDragging';

interface Props {
  className?: string;
  self: boolean;
  iAmAdmin: boolean;
  iAmMaster: boolean;
  message: Message;
}

type ToolboxState = 'NORMAL' | 'MORE' | 'LOADING';

const Box = forwardRef<HTMLDivElement, { className?: string; children: ReactNode }>(({ className, children }, ref) => (
  <div
    ref={ref}
    className="bg-lowest border-surface-200 group-hover:border-surface-500 flex items-stretch rounded-sm border text-base shadow-sm"
  >
    {children}
  </div>
));
Box.displayName = 'MessageToolboxBox';

export const MessageToolbox: FC<Props> = ({ className, message, self, iAmAdmin, iAmMaster }) => {
  const isDragging = useIsDragging();
  const setBanner = useSetBanner();
  const boxRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ToolboxState>('NORMAL');
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  useOutside(
    useCallback(() => setState('NORMAL'), []),
    boxRef,
  );
  const intl = useIntl();

  const handleDelete = async () => {
    setState('LOADING');
    const MAX_LENGTH = 128;
    let { text } = message;
    if (text.length > MAX_LENGTH) {
      text = text.slice(0, MAX_LENGTH - 4) + '...';
    }
    const sure = window.confirm(
      intl.formatMessage({ defaultMessage: 'Are you sure to delete this message:' }) + `\n\n${text}`,
    );
    if (!sure) {
      setState('NORMAL');
      return;
    }
    const result = await post('/messages/delete', { id: message.id }, {});
    if (result.isErr) {
      const errorCode = result.err.code;
      setBanner({
        level: 'ERROR',
        content: <FormattedMessage defaultMessage="Failed to delete message ({ errorCode })" values={{ errorCode }} />,
      });
      setState('NORMAL');
      return;
    } else {
      return;
    }
  };

  const handleArchiveMessage = useCallback(async () => {
    setState('LOADING');
    await post('/messages/toggle_fold', { id: message.id }, {});
    setState('NORMAL');
  }, [message.id]);

  const handleEditMessage = useCallback(() => {
    dispatch({ type: 'editMessage', payload: { message } });
  }, [dispatch, message]);
  if (isDragging) return null;
  return (
    <Box className={className} ref={boxRef}>
      {state === 'LOADING' && (
        <MessageToolboxButton>
          <Spinner />
        </MessageToolboxButton>
      )}
      {state === 'MORE' && (
        <>
          {(self || iAmAdmin) && (
            <MessageToolboxButton onClick={handleDelete}>
              <Trash className="text-text-danger" />
            </MessageToolboxButton>
          )}
          {self && (
            <MessageToolboxButton onClick={handleEditMessage}>
              <Edit />
            </MessageToolboxButton>
          )}
          {(self || iAmMaster) && (
            <MessageToolboxButton onClick={handleArchiveMessage} on={message.folded}>
              <Archive />
            </MessageToolboxButton>
          )}
        </>
      )}
      {state === 'NORMAL' && (
        <>
          {self && (
            <MessageToolboxButton onClick={handleEditMessage}>
              <Edit />
            </MessageToolboxButton>
          )}
          {(self || iAmAdmin) && (
            <MessageToolboxButton onClick={() => setState('MORE')}>
              <EllipsisVertical />
            </MessageToolboxButton>
          )}
        </>
      )}
    </Box>
  );
};
