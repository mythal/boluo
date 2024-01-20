import { ChannelMember } from '@boluo/api';
import { memo, useMemo } from 'react';
import { IsActionIndicator } from './IsActionIndicator';
import { Name } from './Name';
import { SelfPreviewNameEditBox } from './SelfPreviewNameEditBox';
import { autoUpdate, flip, hide, offset, shift, useFloating } from '@floating-ui/react';
import { Settings } from '@boluo/icons';
import { atom, useAtom } from 'jotai';
import { useIsDragging } from '../../hooks/useIsDragging';

interface Props {
  inGame: boolean;
  isAction: boolean;
  name: string;
  channelMember: ChannelMember;
}

const isOpenAtom = atom(true);

export const SelfPreviewNameCell = memo<Props>(({ inGame, name, isAction, channelMember }) => {
  const isDragging = useIsDragging();
  const { isMaster, characterName } = channelMember;
  const [isOpen, setIsOpen] = useAtom(isOpenAtom);

  const { refs, floatingStyles, middlewareData } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'left-start',
    middleware: [flip({ mainAxis: true, crossAxis: false }), shift(), offset({ mainAxis: 4, crossAxis: -4 }), hide()],
    whileElementsMounted: autoUpdate,
  });

  const toolbox = useMemo(() => <SelfPreviewNameEditBox channelMember={channelMember} />, [channelMember]);

  return (
    <div className="@2xl:flex-col @2xl:items-end @2xl:justify-start flex items-center justify-between gap-x-4 gap-y-1 pb-2">
      <div className="flex-shrink-1 @2xl:flex-shrink-0 relative max-w-full flex-grow">
        <button
          data-open={isOpen}
          className="bg-surface-50 border-surface-300 hover:border-surface-500 data-[open=true]:border-surface-600 data-[open=true]:text-highest data-[open=false]:text-surface-500 hover:bg-lowest float-right inline-block self-end rounded-sm border p-0.5 text-sm"
          ref={refs.setReference}
          onClick={() => setIsOpen((x) => !x)}
        >
          <Settings />
        </button>
        {!isAction ? <Name inGame={inGame} name={name} isMaster={isMaster} isPreview self /> : <IsActionIndicator />}
      </div>
      {isOpen && !isDragging && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          data-hidden={middlewareData.hide?.referenceHidden === true}
          className="z-10 data-[hidden=true]:hidden"
        >
          {toolbox}
        </div>
      )}
    </div>
  );
});
SelfPreviewNameCell.displayName = 'SelfPreviewNameCell';
