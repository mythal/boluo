/* eslint-disable @next/next/no-img-element */
import { mediaUrl } from 'api';
import { useApiUrl } from 'common';
import { FC, Suspense } from 'react';
import React from 'react';
interface Props {
  id: string;
  name: string;
  avatarId: string | null;
  onClick?: () => void;
  className?: string;
  size?: number | string;
}

const BoringAvatar = React.lazy(() => import('boring-avatars'));

const variants = [
  'marble',
  'beam',
  // 'sunset',
  'ring',
  'pixel',
  'bauhaus',
] as const;

const EmptyAvatar: FC<Props> = ({ className }) => <div className={className} />;

export const Avatar: FC<Props> = (props) => {
  const { id, size = '1em', name, className, avatarId, onClick } = props;
  const variant = variants[name.charCodeAt(name.length - 1) % variants.length]!;
  const baseUrl = useApiUrl();
  return (
    <Suspense fallback={<EmptyAvatar {...props} />}>
      {avatarId
        ? (
          <img
            alt={name}
            width={size}
            height={size}
            onClick={onClick}
            className={className}
            src={mediaUrl(baseUrl, avatarId)}
          />
        )
        : (
          <BoringAvatar
            size={size}
            square={true}
            variant={variant}
            name={id + name}
            className={className}
            onClick={onClick}
          />
        )}
    </Suspense>
  );
};
