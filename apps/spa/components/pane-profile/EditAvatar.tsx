/* eslint-disable @next/next/no-img-element */
import { Upload, X } from '@boluo/icons';
import { type FC, useCallback, useMemo, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { Avatar } from '../account/Avatar';
import type { ProfileEditSchema } from './PaneProfileEdit';

interface Props {
  userId: string;
  avatar: string | File | null;
  onChange: (avatar: string | File | null) => void;
}

// See: https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types
const ALLOW_AVATAR_MIME = ['image/gif', 'image/jpeg', 'image/png'];

export const EditAvatar: FC<Props> = ({ userId, avatar, onChange }) => {
  const intl = useIntl();
  const avatarLabel = intl.formatMessage({ defaultMessage: 'Avatar' });
  const changeAvatarLabel = intl.formatMessage({ defaultMessage: 'Change Avatar' });
  const removeAvatarLabel = intl.formatMessage({ defaultMessage: 'Remove Avatar' });
  const nickname = useWatch<Pick<ProfileEditSchema, 'nickname'>>({ name: 'nickname' });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const removeAvatar = useCallback(() => onChange(null), [onChange]);
  const triggerUpload = useCallback(() => fileInputRef.current?.click(), []);
  const selectedFileDataUrl: string | null = useMemo(() => {
    if (!(avatar instanceof File)) return null;
    return URL.createObjectURL(avatar);
  }, [avatar]);
  return (
    <div className="@xs:float-right relative inline-flex">
      {selectedFileDataUrl ? (
        <img
          alt={avatarLabel}
          src={selectedFileDataUrl}
          onClick={triggerUpload}
          className="h-28 w-28 cursor-pointer rounded-md"
        />
      ) : (
        <Avatar
          id={userId}
          name={nickname}
          avatarId={typeof avatar === 'string' ? avatar : null}
          size="6rem"
          className="cursor-pointer rounded-md"
          onClick={triggerUpload}
        />
      )}
      <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 hover:opacity-100 group-hover:opacity-75">
        <input
          hidden
          aria-hidden
          type="file"
          accept=".jpg, .jpeg, .png, .gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!ALLOW_AVATAR_MIME.includes(file.type)) {
              return;
            }
            onChange(file);
          }}
          ref={fileInputRef}
        />
        {avatar != null && (
          <Button type="button" data-small aria-label={removeAvatarLabel} onClick={removeAvatar}>
            <X />
          </Button>
        )}
        <Button type="button" data-small aria-label={changeAvatarLabel} onClick={triggerUpload}>
          <Upload />
        </Button>
      </div>
    </div>
  );
};
