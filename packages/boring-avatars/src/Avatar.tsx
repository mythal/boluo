import AvatarBauhaus from './AvatarBauhaus';
import AvatarBeam from './AvatarBeam';
import AvatarMarble from './AvatarMarble';
import AvatarPixel from './AvatarPixel';
import AvatarRing from './AvatarRing';
import AvatarSunset from './AvatarSunset';

const variants = ['pixel', 'bauhaus', 'ring', 'beam', 'sunset', 'marble'];
const deprecatedVariants = { geometric: 'beam', abstract: 'bauhaus' };

export interface AvatarProps {
  size?: number | string;
  name?: string;
  square?: boolean;
  variant?: 'marble' | 'beam' | 'pixel' | 'sunset' | 'ring' | 'bauhaus';
  colors?: string[];
  className?: string;
}

const Avatar = ({
  variant = 'marble',
  colors = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'],
  name = 'Clara Barton',
  square = false,
  size = 40,
  ...props
}: AvatarProps) => {
  const avatarProps = { colors, name, size, square, ...props };
  const checkedVariant = () => {
    if (Object.keys(deprecatedVariants).includes(variant)) {
      return deprecatedVariants[variant];
    }
    if (variants.includes(variant)) {
      return variant;
    }
    return 'marble';
  };
  const avatars = {
    pixel: <AvatarPixel {...avatarProps} />,
    bauhaus: <AvatarBauhaus {...avatarProps} />,
    ring: <AvatarRing {...avatarProps} />,
    beam: <AvatarBeam {...avatarProps} />,
    sunset: <AvatarSunset {...avatarProps} />,
    marble: <AvatarMarble {...avatarProps} />,
  };
  return avatars[checkedVariant()];
};

export default Avatar;
