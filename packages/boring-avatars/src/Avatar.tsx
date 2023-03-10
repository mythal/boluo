import AvatarBauhaus from './AvatarBauhaus';
import AvatarBeam from './AvatarBeam';
import AvatarMarble from './AvatarMarble';
import AvatarPixel from './AvatarPixel';
import AvatarRing from './AvatarRing';
import AvatarSunset from './AvatarSunset';

export interface AvatarProps extends React.HTMLAttributes<SVGElement> {
  size?: number | string;
  name?: string;
  square?: boolean;
  variant?: 'marble' | 'beam' | 'pixel' | 'sunset' | 'ring' | 'bauhaus';
  colors?: string[];
}

const Avatar = ({
  variant = 'marble',
  colors = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'],
  name = 'Clara Barton',
  square = false,
  size = 40,
  ...props
}: AvatarProps) => {
  const avatarProps: AvatarProps = { colors, name, size, square, ...props };
  const avatars = {
    pixel: <AvatarPixel {...avatarProps} />,
    bauhaus: <AvatarBauhaus {...avatarProps} />,
    ring: <AvatarRing {...avatarProps} />,
    beam: <AvatarBeam {...avatarProps} />,
    sunset: <AvatarSunset {...avatarProps} />,
    marble: <AvatarMarble {...avatarProps} />,
  };
  return avatars[variant];
};

export default Avatar;
