import clsx from 'clsx';
import React, { type FC, Ref, type RefObject, useContext, useEffect, useMemo, useRef } from 'react';
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
import { Delay } from '../Delay';
import { useMutateMessageArchive } from '../../hooks/useMutateMessageArchive';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { atom, useAtom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { generateDetailDate } from '../../date';
import { FormattedMessage, useIntl } from 'react-intl';
import { flip, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import Icon from '@boluo/ui/Icon';
import { messageToParsed } from '../../interpreter/to-parsed';
import { toSimpleText } from '../../interpreter/entities';
import { useMutateMessageDelete } from '../../hooks/useMutateMessageDelete';
import { empty, identity } from '@boluo/utils';
import { ErrorBoundary } from '@sentry/nextjs';
import { useIsOptimistic } from '../../hooks/useIsOptimistic';

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
}> = ({ sendBySelf, messageBoxRef, message }) => {
  const member = useMember();
  const admin = member?.space.isAdmin || false;
  const master = member?.channel.isMaster || false;
  const optimistic = useIsOptimistic();
  const permsArchive = admin || master || sendBySelf;
  const permsEdit = sendBySelf && !optimistic;
  const [display, setDisplay] = useAtom(useContext(DisplayContext));
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const store = useStore();

  useEffect(() => {
    if (!messageBoxRef.current) return;
    const messageBox = messageBoxRef.current;

    const handleMouseEnter = () => {
      setDisplay((prevDisplay) => (prevDisplay.type === 'HIDDEN' ? SHOW : prevDisplay));
    };
    const handleMouseLeave = () => {
      setDisplay((prevDisplay) => (prevDisplay.type !== 'SHOW' ? prevDisplay : HIDDEN));
    };
    messageBox.addEventListener('mouseenter', handleMouseEnter);
    messageBox.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      messageBox.removeEventListener('mouseenter', handleMouseEnter);
      messageBox.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [messageBoxRef, setDisplay, store]);
  const archiveButton = useMemo(() => {
    if (!permsArchive) return null;
    return (
      <Delay
        fallback={
          <MessageToolbarButton optimistic={optimistic} pressed={message.folded}>
            <Archive />
          </MessageToolbarButton>
        }
      >
        <MessageArchive messageId={message.id} archived={message.folded} variant="toolbar" />
      </Delay>
    );
  }, [message.folded, message.id, optimistic, permsArchive]);
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
        <MessageToolbarMoreButton message={message} />
      </Delay>
    );
  }, [message]);
  if (display.type === 'HIDDEN') return null;
  return (
    <div
      ref={toolbarRef}
      className={clsx(
        'border-message-toolbar-border hover:border-message-toolbar-hover-border bg-message-toolbar-bg absolute -top-3 right-2 z-10 flex select-none flex-row rounded border p-0.5 shadow-sm',
      )}
    >
      <>
        {archiveButton}
        {editButton}
        {moreButton}
      </>
    </div>
  );
};

interface MessageToolbarButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  children: ReactNode;
  loading?: boolean;
  pressed?: boolean;
  optimistic?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const MessageToolbarButton = ({
  children,
  pressed,
  loading = false,
  optimistic = false,
  ref,
  ...props
}: MessageToolbarButtonProps) => {
  return (
    <button
      ref={ref}
      aria-pressed={pressed}
      disabled={optimistic || props.disabled}
      className={clsx(
        'inline-flex h-[26px] w-[26px] items-center justify-center rounded-sm text-base',
        optimistic ? 'cursor-progress' : '',
        pressed
          ? 'bg-switch-pressed-bg text-switch-pressed-text shadow-inner'
          : 'enabled:hover:bg-switch-hover-bg',
        loading ? 'text-text-lighter cursor-progress' : '',
      )}
      {...props}
    >
      {children}
    </button>
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
        className={clsx('flex-1', isToggling ? 'text-text-lighter cursor-progress' : '')}
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

const MessageToolbarMoreButton: FC<{ message: Message }> = ({ message }) => {
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
  }, [display.type, update]);
  const click = useClick(context, {});
  const dismiss = useDismiss(context);
  const { getFloatingProps, getReferenceProps } = useInteractions([click, dismiss]);
  const more = useMemo(() => <MessageToolbarMore message={message} />, [message]);

  return (
    <>
      <MessageToolbarButton pressed={open} ref={refs.setReference} {...getReferenceProps()}>
        <EllipsisVertical />
      </MessageToolbarButton>
      {open && (
        <div
          style={floatingStyles}
          ref={refs.setFloating}
          {...getFloatingProps()}
          className="border-message-toolbar-more-border bg-message-toolbar-more-bg z-20 flex w-[14rem] flex-col gap-1 rounded-md border p-2 shadow-md"
        >
          {more}
        </div>
      )}
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
        <TriangleAlert className="text-text-warning h-6 w-6 self-center" />
        {display.message}
      </div>
    );
  }
  return (
    <ErrorBoundary fallback={<SomethingWentWrong className="text-text-warning text-sm" />}>
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
      className={deleting ? 'text-text-lighter cursor-progress' : 'text-text-danger'}
    />
  );
};

const MessageDeleteConfirm: FC<{ message: Message }> = ({ message }) => {
  const intl = useIntl();
  const parsed = messageToParsed(message.text, message.entities);
  const simpleText = toSimpleText(parsed.text, parsed.entities);
  const setDisplay = useSetAtom(useContext(DisplayContext));
  return (
    <div className="px-1.5">
      <div className="text-text-lighter py-1 text-xs">
        <FormattedMessage defaultMessage="Are you sure you want to delete this message?" />
      </div>
      <div className="truncate text-nowrap py-1.5 text-sm">{simpleText}</div>
      <div className="flex justify-end">
        <MoreMenuItem
          label={intl.formatMessage({ defaultMessage: 'Nevermind' })}
          icon={X}
          onClick={() => setDisplay(MORE)}
          className="text-text-lighter"
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
    () => <MessageArchive variant="more" messageId={message.id} archived={archived} />,
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
    <div className="flex gap-1">
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
    <div className="text-text-lighter select-text pb-2 text-right text-xs">
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
        'flex gap-1 rounded-sm p-1.5 text-sm',
        optimistic ? 'cursor-progress' : '',
        pressed
          ? 'bg-switch-pressed-bg text-switch-pressed-text shadow-inner'
          : 'enabled:hover:bg-switch-hover-bg',
        className,
      )}
      onClick={optimistic ? empty : onClick}
    >
      <Icon icon={icon} /> <span>{label}</span>
    </button>
  );
};
