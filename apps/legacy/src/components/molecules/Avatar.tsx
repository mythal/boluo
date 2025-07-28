import * as React from 'react';
import { mediaUrl } from '../../api/request';
import Cultist from '../../assets/cultist.svg';

interface Props {
  size?: string;
  id: string | null;
  src?: string;
  onClick?: () => void;
  className?: string;
}

function Avatar({ className, size, id, src, onClick }: Props) {
  size = size || '4rem';
  if (src !== undefined || id != null) {
    if (src === undefined) {
      src = mediaUrl(id!);
    }
    return (
      <img
        alt="用户头像"
        onClick={onClick}
        className={className}
        css={[{ height: size, width: size }]}
        src={src}
      />
    );
  } else {
    return <Cultist onClick={onClick} className={className} width={size} height={size} />;
  }
}

export default Avatar;
