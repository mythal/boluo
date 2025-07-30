/* eslint-disable @next/next/no-img-element */
import { type FC, useMemo } from 'react';
import { getMediaUrl } from '../../media';
import { useQueryAppSettings } from '@boluo/common/hooks';
interface Props {
  id: string;
  name: string;
  avatarId: string | null;
  onClick?: () => void;
  className?: string;
  size?: number | string;
}

// TODO: loading style
export const Avatar: FC<Props> = (props) => {
  const { id, size = '1em', name, className, avatarId, onClick } = props;
  const { data: appSettings } = useQueryAppSettings();
  const style = useMemo(() => {
    if (size == null || size === '') {
      return undefined;
    }
    return { width: size, height: size };
  }, [size]);

  if (avatarId && appSettings?.mediaUrl) {
    return (
      <img
        alt={name}
        style={style}
        onClick={onClick}
        className={className}
        src={getMediaUrl(appSettings.mediaUrl, avatarId)}
      />
    );
  }

  const src = `https://avatars.boluochat.com/${encodeURIComponent(id + name)}`;
  return <img className={className} style={style} onClick={onClick} alt={name} src={src} />;
};
