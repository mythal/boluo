import { type FC, useMemo } from 'react';
import { getMediaUrl } from '@boluo/utils/media';
import { useIntl } from 'react-intl';

interface Props {
  id: string;
  name: string;
  mediaUrl: string | null | undefined;
  avatarId: string | null;
  onClick?: () => void;
  className?: string;
  size?: number | string;
}

export const Avatar: FC<Props> = (props) => {
  const intl = useIntl();
  const { id, size = '1em', name, className, avatarId, onClick, mediaUrl } = props;
  const style = useMemo(() => {
    if (size == null || size === '') {
      return undefined;
    }
    return { width: size, height: size };
  }, [size]);

  const alt = intl.formatMessage({ defaultMessage: 'Avatar of {name}' }, { name });

  if (avatarId && mediaUrl) {
    return (
      <img
        alt={alt}
        style={style}
        onClick={onClick}
        className={className}
        src={getMediaUrl(mediaUrl, avatarId)}
      />
    );
  }

  const src = `https://avatars.boluochat.com/${encodeURIComponent(id + name)}`;
  return <img className={className} style={style} onClick={onClick} alt={alt} src={src} />;
};
