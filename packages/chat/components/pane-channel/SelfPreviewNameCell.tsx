import { ChannelMember } from 'api';
import { memo } from 'react';
import { IsActionIndicator } from './IsActionIndicator';
import { Name } from './Name';
import { SelfPreviewToolbox } from './SelfPreviewToolbox';
import { autoUpdate, flip, hide, offset, shift, useFloating } from '@floating-ui/react';
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

  const { refs, floatingStyles, middlewareData } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'left-start',
    middleware: [flip({ mainAxis: true, crossAxis: false }), shift(), offset({ mainAxis: 4, crossAxis: -4 }), hide()],
    whileElementsMounted: autoUpdate,
  });

  return (
    <div className="@2xl:flex-col @2xl:items-end @2xl:justify-start flex items-center justify-between gap-x-4 gap-y-1 pb-2">
      <div className="flex-shrink-1 @2xl:flex-shrink-0 relative max-w-full flex-grow">
        {!isAction ? <Name inGame={inGame} name={name} isMaster={isMaster} isPreview self /> : <IsActionIndicator />}

        <button
          data-open={isOpen}
          className="bg-surface-50 border-surface-300 hover:border-surface-500 data-[open=true]:border-surface-600 data-[open=true]:text-highest data-[open=false]:text-surface-500 hover:bg-lowest inline-block self-end rounded-sm border p-0.5 text-sm"
          ref={refs.setReference}
          onClick={() => setIsOpen((x) => !x)}
        >
          <Settings />
        </button>
      </div>
      {isOpen && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className={`z-10 ${middlewareData.hide?.referenceHidden === true ? 'hidden' : ''}`}
        >
          <SelfPreviewToolbox channelMember={channelMember} />
        </div>
      )}
    </div>
  );
});
SelfPreviewNameCell.displayName = 'SelfPreviewNameCell';
