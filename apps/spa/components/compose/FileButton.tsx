import Trash from '@boluo/icons/Trash';
import Upload from '@boluo/icons/Upload';
import { useAtomValue, useSetAtom } from 'jotai';
import { type FC, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { InComposeButton } from './InComposeButton';
import { useTooltip } from '@boluo/ui/hooks/useTooltip';
import { TooltipBox } from '@boluo/ui/TooltipBox';

interface Props {
  className?: string;
}

export const FileButton: FC<Props> = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const intl = useIntl();
  const { composeAtom, hasMediaAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const hasMedia = useAtomValue(hasMediaAtom);
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } =
    useTooltip('top-start');
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    const file = files[0]!;
    dispatch({ type: 'media', payload: { media: file } });
    // reset file input
    event.target.value = '';
  };
  const handleClick = () => {
    if (hasMedia) {
      dispatch({ type: 'media', payload: { media: null } });
    } else {
      inputRef.current?.click();
    }
  };
  const title = hasMedia
    ? intl.formatMessage({ defaultMessage: 'Remove File' })
    : intl.formatMessage({ defaultMessage: 'Add File' });
  return (
    <div
      ref={refs.setReference}
      {...getReferenceProps()}
      className="FileButton relative shrink-0 py-1 pl-1"
    >
      <InComposeButton onClick={handleClick} label={title}>
        {hasMedia ? <Trash /> : <Upload />}
      </InComposeButton>
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        aria-hidden
        hidden
        onChange={handleFileChange}
      />
      <TooltipBox
        show={showTooltip}
        style={floatingStyles}
        ref={refs.setFloating}
        {...getFloatingProps()}
        defaultStyle
      >
        <FormattedMessage defaultMessage="Add a file" />
      </TooltipBox>
    </div>
  );
};
