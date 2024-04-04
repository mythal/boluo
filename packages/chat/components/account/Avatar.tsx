/* eslint-disable @next/next/no-img-element */
import { FC, Suspense } from 'react';
import React from 'react';
import { getMediaUrl } from '../../media';
interface Props {
  id: string;
  name: string;
  avatarId: string | null;
  onClick?: () => void;
  className?: string;
  size?: number | string;
}

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
  const avatarSrc = () => {
    const key = id + name;
    const encoded = encodeURIComponent(key);
    return `https://avatars.boluo.chat/${encoded}`;
  };
  return (
    <Suspense fallback={<EmptyAvatar {...props} />}>
      {avatarId ? (
        <img
          alt={name}
          style={size != null ? { width: size, height: size } : undefined}
          onClick={onClick}
          className={className}
          src={getMediaUrl(avatarId)}
        />
      ) : (
        <img className={className} onClick={onClick} alt={name} src={avatarSrc()} />
      )}
    </Suspense>
  );
};
