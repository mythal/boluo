import { Paperclip, Trash } from 'icons';
import { useSetAtom } from 'jotai';
import { FC, useCallback, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useComposingMedia } from '../../hooks/useComposingMedia';
import { mediaMaxSizeByte, mediaMaxSizeMb, supportedMediaType, validateMedia } from '../../media';

interface Props {
  className?: string;
}

export const ComposingMediaInfo: FC<Props> = ({ className = '' }) => {
  const media = useComposingMedia();
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const handleRemoveMedia = useCallback(
    () => dispatch({ type: 'media', payload: { media: null }, context: undefined }),
    [dispatch],
  );
  const validateResult = useMemo(() => validateMedia(media), [media]);
  if (media == null) {
    return null;
  }
  return (
    <div className="bg-lowest py-1 px-2 rounded shadow max-w-[8rem] @md:max-w-[20rem] overflow-hidden text-sm">
      <div className="flex items-center gap-1">
        <span>
          <Paperclip />
        </span>
        <span className="font-mono truncate">
          {media.name}
        </span>
        <button
          onClick={handleRemoveMedia}
          className="p-1 text-surface-500 group-hover:text-text border border-transprent group-hover:border-surface-300 rounded hover:bg-surface-100"
        >
          <Trash />
        </button>
      </div>
      {validateResult.isErr && (
        <ul className="flex flex-col gap-1 mt-4 list-disc pl-4">
          {!supportedMediaType.includes(media.type) && (
            <li className="">
              <span className="text-error-500">
                <FormattedMessage defaultMessage="Unsupported media type" />
              </span>
            </li>
          )}
          {media.size > mediaMaxSizeByte && (
            <li>
              <span className="text-error-500">
                <FormattedMessage
                  defaultMessage="Size must be less than {mediaMaxSizeMb}M."
                  values={{ mediaMaxSizeMb }}
                />
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
