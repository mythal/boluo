import { Gamemaster } from '@boluo/icons';
import { useState, type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { NameBox } from './NameBox';
import { User } from '@boluo/api';
import { ResolvedTheme } from '@boluo/theme';
import { useMessageColor } from '../../hooks/useMessageColor';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  hide,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { UserCard } from '../common/UserCard';

interface Props {
  name: string | undefined | null;
  inGame: boolean;
  user: User | null | undefined;
  isMaster: boolean;
  self: boolean;
  isPreview?: boolean;
  theme: ResolvedTheme;
  messageColor?: string | null | undefined;
}

export const Name: FC<Props> = ({ name, isMaster, inGame, user, theme, messageColor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { refs, floatingStyles, middlewareData, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    middleware: [flip({ mainAxis: true, crossAxis: false }), shift(), offset({ mainAxis: 4, crossAxis: -4 }), hide()],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  const isEmptyName = name === '' || name == null;
  const color = useMessageColor(theme, user, inGame, messageColor);
  const masterIcon = <Gamemaster className="inline-block h-[1em] w-[1em]" />;
  return (
    <>
      <NameBox
        pressed={isOpen}
        interactive={user != null}
        color={inGame ? color : undefined}
        icon={isMaster ? masterIcon : undefined}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {isEmptyName ? (
          <span className="text-error-400 italic">
            <FormattedMessage defaultMessage="No Name" />
          </span>
        ) : (
          name
        )}
      </NameBox>
      {isOpen && user && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className={middlewareData.hide?.referenceHidden === true ? 'hidden' : ''}
          >
            <UserCard user={user} />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
