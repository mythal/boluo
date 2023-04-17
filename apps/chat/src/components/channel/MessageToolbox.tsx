import { Message } from 'api';
import { usePost } from 'common';
import { Edit, Trash, X } from 'icons';
import { FC, forwardRef, ReactNode, useCallback, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Spinner } from 'ui';
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
  const post = usePost();
  const boxRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ToolboxState>('NORMAL');
  useOutside(useCallback(() => setState('NORMAL'), []), boxRef);
  const handleDelete = async () => {
    setState('LOADING');
    const result = await post('/messages/delete', { id: message.id }, {});
    if (result.isErr) {
      // TODO: error handing
      setState('NORMAL');
      return;
    } else {
      return;
    }
  };
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
          <MessageToolboxButton onClick={() => setState('DELETE_CONFRIM')}>
            <Trash />
          </MessageToolboxButton>
          <MessageToolboxButton>
            <Edit />
          </MessageToolboxButton>
        </>
      )}
    </Box>
  );
};
