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

interface Props {
  className?: string;
  message: Message;
}

type ToolboxState = 'NORMAL' | 'DELETE_CONFRIM' | 'LOADING';

const Box = forwardRef<HTMLDivElement, { className?: string; children: ReactNode }>(({ className, children }, ref) => (
  <div ref={ref} className="flex shadow rounded-sm bg-surface-200 items-stretch text-base">
    {children}
  </div>
));
Box.displayName = 'MessageToolboxBox';

export const MessageToolbox: FC<Props> = ({ className, message }) => {
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
          <MessageToolboxButton onClick={handleArchiveMessage} on={message.folded}>
            <Archive />
          </MessageToolboxButton>
          <MessageToolboxButton onClick={() => setState('DELETE_CONFRIM')}>
            <Trash />
          </MessageToolboxButton>
          <MessageToolboxButton onClick={handleEditMessage}>
            <Edit />
          </MessageToolboxButton>
        </>
      )}
    </Box>
  );
};
