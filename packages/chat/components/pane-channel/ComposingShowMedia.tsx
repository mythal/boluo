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
  const handleRemoveMedia = useCallback(() => dispatch({ type: 'media', payload: { media: null } }), [dispatch]);
  const validateResult = useMemo(() => validateMedia(media), [media]);
  if (media == null) {
    return null;
  }
  return (
    <div className="bg-lowest @md:max-w-[20rem] max-w-[8rem] overflow-hidden rounded px-2 py-1 text-sm shadow">
      <div className="flex items-center gap-1">
        <span>
          <Paperclip />
        </span>
        <span className="truncate font-mono">{media.name}</span>
        <button
          onClick={handleRemoveMedia}
          className="text-surface-500 group-hover:text-text-base border-transprent group-hover:border-surface-300 hover:bg-surface-100 rounded border p-1"
        >
          <Trash />
        </button>
      </div>
      {validateResult.isErr && (
        <ul className="mt-4 flex list-disc flex-col gap-1 pl-4">
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
