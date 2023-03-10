import { FC, Suspense } from 'react';
import React from 'react';
interface Props {
  id: string;
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
  const { id, size = '1em', className, onClick } = props;
  const variant = variants[id.charCodeAt(id.length - 1) % variants.length]!;
  return (
    <Suspense fallback={<EmptyAvatar {...props} />}>
      <BoringAvatar size={size} square={true} variant={variant} name={id} className={className} onClick={onClick} />
    </Suspense>
  );
};
