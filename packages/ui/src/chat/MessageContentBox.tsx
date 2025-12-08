import { FC, Ref } from 'react';

interface Props {
  children?: React.ReactNode;
  ref?: Ref<HTMLDivElement>;
  pos?: number;
  isLast?: boolean;
}

export const MessageContentBox: FC<Props> = ({ children, ref, pos, isLast }) => {
  return (
    <div
      className="pr-message-small compact:pr-message-compact irc:pr-message"
      ref={ref}
      data-read-position={pos}
      data-is-last={isLast}
    >
      {children}
    </div>
  );
};
