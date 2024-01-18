import { autoUpdate, useDismiss, useFloating, useHover, useInteractions, useRole } from '@floating-ui/react';
import { Message } from 'api';
import clsx from 'clsx';
import { FC, useState } from 'react';
import { FormattedMessage } from 'react-intl';

interface Props {
  message: Message;
}

const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

const detailDate = (date: Date): string => {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const minutes = date.getMinutes();
  const hours = date.getHours();
  const seconds = date.getSeconds();
  return `${year}-${pad(month)}-${pad(day)} ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export const MessageTime: FC<Props> = ({ message }) => {
  const [isOpen, setIsOpen] = useState(false);
  const date = new Date(message.created);
  const editedDate = new Date(message.modified);
  const minutesStr = String(date.getMinutes());
  const minutes = minutesStr.length === 1 ? `0${minutesStr}` : minutesStr;
  const edited = message.modified !== message.created;
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top-start',
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, { move: false });
  const dismiss = useDismiss(context);
  const role = useRole(context, {
    role: 'tooltip',
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss, role]);
  return (
    <>
      <time
        data-edited={edited}
        className="float-left mr-1 self-start text-right text-xs decoration-dotted data-[edited=true]:underline"
        dateTime={message.created}
        title={detailDate(date)}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {date.getHours()}:{minutes}
      </time>

      {isOpen && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="bg-highest text-lowest rounded px-2 py-1 text-left text-sm"
          {...getFloatingProps()}
        >
          <div>
            {edited && (
              <span>
                {detailDate(editedDate)} <FormattedMessage defaultMessage="Edited" />
              </span>
            )}
          </div>
          <div>{detailDate(date)}</div>
        </div>
      )}
    </>
  );
};
