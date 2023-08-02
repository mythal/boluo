/* eslint-disable @next/next/no-img-element */
import { FC, Suspense, useContext } from 'react';
import React from 'react';
import { ConfigurationContext } from '../../configuration';
import { getMediaUrl } from '../../media';
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
  const { mediaPublicUrl } = useContext(ConfigurationContext);
  // Select a variant based on the last character of the name
  const variant = variants[name.charCodeAt(name.length - 1) % variants.length]!;
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
            src={getMediaUrl(mediaPublicUrl, avatarId)}
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
