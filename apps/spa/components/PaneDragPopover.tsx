import { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import { SizeLevelContext } from '../state/pane-size';
import { useAtom } from 'jotai';
import { ButtonInline } from '@boluo/ui/ButtonInline';

interface Props {
  isChild?: boolean;
}

export const PaneDragPopover = ({ isChild }: Props) => {
  const sizeLevelAtom = useContext(SizeLevelContext);
  const [sizeLevel, setSizeLevel] = useAtom(sizeLevelAtom);
  return (
    <div>
      <div className="font-bold">
        <FormattedMessage defaultMessage="Drag to Move Pane" />
      </div>
      {!isChild && (
        <div>
          <div className="pt-4 pb-2">
            <FormattedMessage defaultMessage="Adjust Size" />
          </div>
          <div className="flex gap-1">
            <span className="grow">{sizeLevel}</span>
            <ButtonInline className="w-6" onClick={() => setSizeLevel(0)}>
              0
            </ButtonInline>
            <ButtonInline className="w-6" onClick={() => setSizeLevel(sizeLevel - 1)}>
              -
            </ButtonInline>
            <ButtonInline className="w-6" onClick={() => setSizeLevel(sizeLevel + 1)}>
              +
            </ButtonInline>
          </div>
        </div>
      )}
    </div>
  );
};
