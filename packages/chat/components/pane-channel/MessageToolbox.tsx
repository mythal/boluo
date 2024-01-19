import { Message } from 'api';
import { post } from 'api-browser';
import { Archive, Edit, Trash, X } from 'icons';
import { useSetAtom } from 'jotai';
import { FC, forwardRef, ReactNode, useCallback, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Spinner } from 'ui/Spinner';
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

type ToolboxState = 'NORMAL' | 'DELETE_CONFRIM' | 'LOADING';

const Box = forwardRef<HTMLDivElement, { className?: string; children: ReactNode }>(({ className, children }, ref) => (
  <div ref={ref} className="bg-surface-200 flex items-stretch rounded-sm text-base shadow">
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
  const handleDelete = async () => {
    setState('LOADING');
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
      {state === 'DELETE_CONFRIM' && (
        <>
          <MessageToolboxButton type="DANGER" onClick={handleDelete}>
            <Trash className="inline-block" />
            <span>
              <FormattedMessage defaultMessage="Confirm Delete" />
            </span>
          </MessageToolboxButton>
          <MessageToolboxButton onClick={() => setState('NORMAL')}>
            <X />
          </MessageToolboxButton>
        </>
      )}
      {state === 'LOADING' && (
        <MessageToolboxButton>
          <Spinner />
        </MessageToolboxButton>
      )}
      {state === 'NORMAL' && (
        <>
          {(self || iAmMaster) && (
            <MessageToolboxButton onClick={handleArchiveMessage} on={message.folded}>
              <Archive />
            </MessageToolboxButton>
          )}
          {(self || iAmAdmin) && (
            <MessageToolboxButton onClick={() => setState('DELETE_CONFRIM')}>
              <Trash />
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
