import clsx from 'clsx';
import React, {
  Activity,
  type FC,
  type RefObject,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useTransition,
} from 'react';
import { type Message } from '@boluo/api';
import { type ReactNode } from 'react';
import {
  Archive,
  ClipboardCopy,
  Edit,
  EllipsisVertical,
  Trash,
  TriangleAlert,
  X,
} from '@boluo/icons';
import { SomethingWentWrong } from '@boluo/ui/SomethingWentWrong';
import { useMember } from '../../hooks/useMember';
import { Delay } from '@boluo/ui/Delay';
import { useMutateMessageArchive } from '@boluo/hooks/useMutateMessageArchive';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { atom, useAtom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { generateDetailDate } from '../../date';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  flip,
  safePolygon,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
} from '@floating-ui/react';
import Icon from '@boluo/ui/Icon';
import { MessageToolbarBox } from '@boluo/ui/chat/MessageToolbarBox';
import { MessageToolbarButton } from '@boluo/ui/chat/MessageToolbarButton';
import { CircleIndicator } from '@boluo/ui/CircleIndicator';
import { messageToParsed, toSimpleText } from '@boluo/interpreter';
import { useMutateMessageDelete } from '@boluo/hooks/useMutateMessageDelete';
import { empty, identity } from '@boluo/utils/function';
import { ErrorBoundary } from '@sentry/nextjs';
import { useIsOptimistic } from '../../hooks/useIsOptimistic';
import { useIsDragging } from '../../hooks/useIsDragging';
import { useLongPressProgress } from '../../hooks/useLongPressProgress';

type ToolbarDisplay =
  | { type: 'HIDDEN' }
  | { type: 'SHOW' }
  | { type: 'MORE' }
  | { type: 'CONFIRM_DELETE' }
  | { type: 'ERROR'; message: ReactNode };

const HIDDEN = { type: 'HIDDEN' } as const;
const SHOW = { type: 'SHOW' } as const;
const MORE = { type: 'MORE' } as const;
const CONFIRM_DELETE = { type: 'CONFIRM_DELETE' } as const;

export const makeMessageToolbarDisplayAtom = () => atom<ToolbarDisplay>(HIDDEN);
const defaultDisplayAtom = makeMessageToolbarDisplayAtom();
type DisplayAtom = typeof defaultDisplayAtom;
export const DisplayContext = React.createContext<DisplayAtom>(defaultDisplayAtom);

export const MessageToolbar: FC<{
  sendBySelf: boolean;
  message: Message;
  messageBoxRef: RefObject<HTMLDivElement | null>;
  longPressStart: number | null;
  longPressDuration: number;
}> = ({ sendBySelf, messageBoxRef, message, longPressStart, longPressDuration }) => {
  const optimistic = useIsOptimistic();
  const [, startTransition] = useTransition();
  const permsEdit = sendBySelf && !optimistic;
  const [display, setDisplay] = useAtom(useContext(DisplayContext));
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const store = useStore();
  const isDragging = useIsDragging();

  useEffect(() => {
    if (!messageBoxRef.current) return;
    const messageBox = messageBoxRef.current;

    const handleMouseEnter = () => {
      if (isDragging) return;
      startTransition(() => {
        setDisplay((prevDisplay) => (prevDisplay.type === 'HIDDEN' ? SHOW : prevDisplay));
      });
    };
    const handleMouseLeave = () => {
      if (isDragging) return;
      startTransition(() => {
        setDisplay((prevDisplay) => (prevDisplay.type !== 'SHOW' ? prevDisplay : HIDDEN));
      });
    };
    messageBox.addEventListener('mouseenter', handleMouseEnter);
    messageBox.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      messageBox.removeEventListener('mouseenter', handleMouseEnter);
      messageBox.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isDragging, messageBoxRef, setDisplay, store]);
  useEffect(() => {
    if (isDragging) {
      setDisplay(HIDDEN);
    }
  }, [isDragging, setDisplay]);
  const editButton = useMemo(() => {
    if (!permsEdit) return null;
    return (
      <Delay
        fallback={
          <MessageToolbarButton optimistic={optimistic}>
            <Edit />
          </MessageToolbarButton>
        }
      >
        <MessageEdit message={message} variant="toolbar" />
      </Delay>
    );
  }, [message, optimistic, permsEdit]);
  const moreButton = useMemo(() => {
    return (
      <Delay
        fallback={
          <MessageToolbarButton>
            <EllipsisVertical />
          </MessageToolbarButton>
        }
      >
        <MessageToolbarMoreButton
          message={message}
          longPressStart={longPressStart}
          longPressDuration={longPressDuration}
        />
      </Delay>
    );
  }, [longPressDuration, longPressStart, message]);
  if (display.type === 'HIDDEN') return null;
  return (
    <MessageToolbarBox ref={toolbarRef}>
      {editButton}
      {moreButton}
    </MessageToolbarBox>
  );
};

const MessageArchive: FC<{ messageId: string; archived: boolean; variant: 'toolbar' | 'more' }> = ({
  messageId,
  archived,
  variant,
}) => {
  const setDisplay = useSetAtom(useContext(DisplayContext));
  const optimistic = useIsOptimistic();
  const intl = useIntl();
  const { trigger: toggle, isMutating: isToggling } = useMutateMessageArchive(messageId, {
    revalidate: false,
    populateCache: identity,
    onError: () => {
      setDisplay({
        type: 'ERROR',
        message: intl.formatMessage({ defaultMessage: 'Failed to archive the message' }),
      });
    },
  });
  if (variant === 'toolbar') {
    return (
      <>
        <MessageToolbarButton
          optimistic={optimistic}
          loading={isToggling}
          onClick={() => (isToggling ? empty() : toggle())}
          pressed={archived}
        >
          <Archive />
        </MessageToolbarButton>
      </>
    );
  } else {
    return (
      <MoreMenuItem
        icon={Archive}
        pressed={archived}
        optimistic={optimistic}
        onClick={isToggling ? empty : toggle}
        label={intl.formatMessage({ defaultMessage: 'Archive' })}
        className={clsx('flex-1', isToggling ? 'text-text-muted cursor-progress' : '')}
      />
    );
  }
};

const MessageEdit: FC<{ message: Message; variant: 'toolbar' | 'more' }> = ({
  message,
  variant,
}) => {
  const optimistic = useIsOptimistic();
  const composeAtom = useComposeAtom();
  const intl = useIntl();
  const label = intl.formatMessage({ defaultMessage: 'Edit' });
  const dispatch = useSetAtom(composeAtom);
  const member = useMember();
  if (!member || member.user.id !== message.senderId) {
    return null;
  }

  const handleEditMessage = () => {
    dispatch({ type: 'editMessage', payload: { message } });
  };

  if (variant === 'toolbar') {
    return (
      <MessageToolbarButton onClick={handleEditMessage} optimistic={optimistic}>
        <Edit />
      </MessageToolbarButton>
    );
  } else {
    return (
      <MoreMenuItem icon={Edit} onClick={handleEditMessage} optimistic={optimistic} label={label} />
    );
  }
};

const shoudShowMore = (type: ToolbarDisplay['type']) => {
  switch (type) {
    case 'MORE':
    case 'ERROR':
    case 'CONFIRM_DELETE':
      return true;
    default:
      return false;
  }
};

const MessageToolbarMoreButton: FC<{
  message: Message;
  longPressStart: number | null;
  longPressDuration: number;
}> = ({ message, longPressStart, longPressDuration }) => {
  const displayAtom = useContext(DisplayContext);
  const [display, setDisplay] = useAtom(displayAtom);
  const open = shoudShowMore(display.type);
  const { refs, floatingStyles, context, update } = useFloating<HTMLButtonElement>({
    open,
    onOpenChange: (isOpen, _event, reason) => {
      switch (reason) {
        case 'outside-press':
        case 'escape-key':
        case 'ancestor-scroll':
          setDisplay(HIDDEN);
          break;
        default:
          setDisplay(isOpen ? MORE : SHOW);
      }
    },
    placement: 'top-end',
    middleware: [flip()],
  });
  useEffect(() => {
    if (shoudShowMore(display.type)) {
      update();
    }
  }, [
    display.type,
    update,
    // Update when message changes
    message,
  ]);
  const hover = useHover(context, { delay: { open: 200, close: 0 }, handleClose: safePolygon() });
  const dismiss = useDismiss(context);
  const { getFloatingProps, getReferenceProps } = useInteractions([hover, dismiss]);
  const more = useMemo(() => <MessageToolbarMore message={message} />, [message]);
  const showLongPressProgress = longPressStart != null && !open;
  const { progress } = useLongPressProgress(
    longPressStart,
    longPressDuration,
    showLongPressProgress,
  );

  return (
    <>
      <MessageToolbarButton
        pressed={open}
        loading={showLongPressProgress}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {showLongPressProgress ? (
          <CircleIndicator className="h-4 w-4" progress={progress} />
        ) : (
          <EllipsisVertical />
        )}
      </MessageToolbarButton>
      <Activity mode={open ? 'visible' : 'hidden'}>
        <div
          style={floatingStyles}
          ref={refs.setFloating}
          {...getFloatingProps()}
          className="bg-surface-default border-border-default z-20 flex w-56 flex-col gap-1 rounded-md border p-2 shadow-md transition-colors"
        >
          {more}
        </div>
      </Activity>
    </>
  );
};

const MessageToolbarMore: FC<{ message: Message }> = ({ message }) => {
  const display = useAtomValue(useContext(DisplayContext));
  const detailDate = useMemo(
    () => <MessageDetailDate created={message.created} edited={message.modified} />,
    [message.created, message.modified],
  );
  if (display.type === 'ERROR') {
    return (
      <div className="flex gap-2 p-1 text-sm">
        <TriangleAlert className="text-state-warning-text h-6 w-6 self-center" />
        {display.message}
      </div>
    );
  }
  return (
    <ErrorBoundary fallback={<SomethingWentWrong className="text-state-warning-text text-sm" />}>
      {detailDate}
      {display.type === 'CONFIRM_DELETE' ? (
        <MessageDeleteConfirm message={message} />
      ) : (
        <>
          <CopyMessageSource source={message.text} />
          <MessageEdit message={message} variant="more" />
          <MessageArchiveOrDelete message={message} />
        </>
      )}
    </ErrorBoundary>
  );
};

const MessageDeleteButton: FC<{ messageId: string }> = ({ messageId }) => {
  const setDisplay = useSetAtom(useContext(DisplayContext));
  const intl = useIntl();
  const { trigger: deleteMessage, isMutating: deleting } = useMutateMessageDelete(messageId, {
    revalidate: false,
    onError: () => {
      setDisplay({
        type: 'ERROR',
        message: intl.formatMessage({ defaultMessage: 'Failed to delete the message' }),
      });
    },
  });
  return (
    <MoreMenuItem
      icon={Trash}
      label={intl.formatMessage({ defaultMessage: 'Delete' })}
      onClick={deleting ? empty : deleteMessage}
      className={deleting ? 'text-text-muted cursor-progress' : 'text-state-danger-text'}
    />
  );
};

const MessageDeleteConfirm: FC<{ message: Message }> = ({ message }) => {
  const intl = useIntl();
  const parsed = messageToParsed(message.text, message.entities);
  const simpleText = toSimpleText(parsed.text, parsed.entities);
  const setDisplay = useSetAtom(useContext(DisplayContext));
  return (
    <div className="MessageDeleteConfirm px-1.5">
      <div className="text-text-muted py-1 text-xs">
        <FormattedMessage defaultMessage="Are you sure you want to delete this message?" />
      </div>
      <div className="truncate py-1.5 text-sm text-nowrap">{simpleText}</div>
      <div className="flex justify-end">
        <MoreMenuItem
          label={intl.formatMessage({ defaultMessage: 'Nevermind' })}
          icon={X}
          onClick={() => setDisplay(MORE)}
          className="text-text-muted"
        />
        <MessageDeleteButton messageId={message.id} />
      </div>
    </div>
  );
};
const MessageArchiveOrDelete: FC<{ message: Message }> = ({ message }) => {
  const intl = useIntl();
  const member = useMember();
  const optimistic = useIsOptimistic();
  const sendBySelf = message.senderId === member?.user.id;
  const premsDelete = member?.space.isAdmin || sendBySelf;
  const premsArchive = member?.channel.isMaster || sendBySelf;
  const setDisplay = useSetAtom(useContext(DisplayContext));
  const archived = message.folded;
  const archiveButton = useMemo(
    () => <MessageArchive variant="more" messageId={message.id} archived={archived ?? false} />,
    [archived, message.id],
  );
  const confirmDeleteButton = useMemo(
    () => (
      <MoreMenuItem
        icon={Trash}
        optimistic={optimistic}
        label={intl.formatMessage({ defaultMessage: 'Delete' })}
        onClick={() => {
          setDisplay(CONFIRM_DELETE);
        }}
        className=""
      />
    ),
    [intl, optimistic, setDisplay],
  );
  if (!premsDelete && !premsArchive) return null;
  if (!premsDelete) return archiveButton;
  return (
    <div className="MessageArchiveOrDelete flex gap-1">
      {archived ? <MessageDeleteButton messageId={message.id} /> : confirmDeleteButton}
      {archiveButton}
    </div>
  );
};

const CopyMessageSource: FC<{ source: string }> = ({ source }) => {
  const setDisplay = useSetAtom(useContext(DisplayContext));
  const copy = () => {
    void navigator.clipboard.writeText(source);
    setDisplay(SHOW);
  };
  const intl = useIntl();
  return (
    <MoreMenuItem
      icon={ClipboardCopy}
      label={intl.formatMessage({ defaultMessage: 'Copy Source' })}
      onClick={copy}
      className=""
    />
  );
};

const MessageDetailDate: FC<{ created: string; edited: string }> = ({ created, edited }) => {
  const isEdited = created !== edited;
  const createdDate = generateDetailDate(new Date(created));
  const editedDate = generateDetailDate(new Date(edited));
  return (
    <div className="MessageDetailDate text-text-muted pb-2 text-right text-xs select-text">
      <div className="">
        <FormattedMessage defaultMessage="Created at" />{' '}
        <time className="font-mono">{createdDate}</time>
      </div>
      {isEdited && (
        <div className="pt-0.5">
          <FormattedMessage defaultMessage="Edited at" />{' '}
          <time className="font-mono">{editedDate}</time>
        </div>
      )}
    </div>
  );
};

const MoreMenuItem: FC<{
  icon: typeof Trash;
  label: string;
  className?: string;
  pressed?: boolean;
  optimistic?: boolean;
  onClick?: () => void;
}> = ({ icon, label, className, pressed, onClick, optimistic = false }) => {
  return (
    <button
      aria-pressed={pressed}
      disabled={optimistic}
      className={clsx(
        'MoreMenuItem text-text-primary flex gap-1 rounded-sm p-1.5 text-sm transition-colors',
        optimistic ? 'cursor-progress' : '',
        pressed
          ? 'bg-surface-interactive-active shadow-inner'
          : 'enabled:hover:bg-surface-interactive-hover',
        className,
      )}
      onClick={optimistic ? empty : onClick}
    >
      <Icon icon={icon} /> <span>{label}</span>
    </button>
  );
};
