import { Message } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { EllipsisVertical } from '@boluo/icons';
import { atom, useAtom, useSetAtom } from 'jotai';
import { FC, forwardRef, ReactNode, useCallback, useId, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSetBanner } from '../../hooks/useBanner';
import { useComposeAtom } from '../../hooks/useComposeAtom';
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
  const [expandedId, setExpandedId] = useAtom(expandToolboxAtom);
  const expanded = expandedId === toolboxId;
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
    <div>
      <button
        aria-pressed={expanded}
        className={clsx(
          'border-transprent h-6 w-6 rounded-sm border text-sm ',
          expanded
            ? 'bg-switch-pressed-bg text-text-base shadow-inner'
            : 'text-text-light group-hover:bg-message-menu-button-bg group-hover:border-surface-200 group-hover:shadow-sm',
        )}
        onClick={() => setExpandedId((prev) => (prev === toolboxId ? '' : toolboxId))}
      >
        <Icon icon={EllipsisVertical} />
      </button>
    </div>
  );
};
