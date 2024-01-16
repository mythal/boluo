import { ChannelMember } from 'api';
import { memo } from 'react';
import { IsActionIndicator } from './IsActionIndicator';
import { Name } from './Name';
import { NameToolbox } from './NameToolbox';
import { autoUpdate, flip, offset, useFloating } from '@floating-ui/react';
import { Button } from 'ui/Button';
import { Settings } from 'icons';
import { atom, useAtom } from 'jotai';

interface Props {
  inGame: boolean;
  isAction: boolean;
  name: string;
  channelMember: ChannelMember;
}

const isOpenAtom = atom(true);

export const SelfPreviewNameCell = memo<Props>(({ inGame, name, isAction, channelMember }) => {
  const { isMaster, characterName } = channelMember;
  const [isOpen, setIsOpen] = useAtom(isOpenAtom);

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-end',
    middleware: [flip({}), offset(4)],
    whileElementsMounted: autoUpdate,
  });

  return (
    <div className="@2xl:flex-col @2xl:items-end @2xl:justify-start flex items-center justify-between gap-x-4 gap-y-1 pb-2">
      <div className="flex-shrink-1 @2xl:flex-shrink-0 relative max-w-full flex-grow">
        {!isAction ? <Name inGame={inGame} name={name} isMaster={isMaster} isPreview self /> : <IsActionIndicator />}
        <Button
          data-small
          data-type="switch"
          data-on={isOpen}
          ref={refs.setReference}
          onClick={() => setIsOpen((x) => !x)}
        >
          <Settings />
        </Button>
      </div>
      {isOpen && (
        <div ref={refs.setFloating} style={floatingStyles} className="z-10">
          <NameToolbox channelMember={channelMember} />
        </div>
      )}
    </div>
  );
});
SelfPreviewNameCell.displayName = 'SelfPreviewNameCell';
