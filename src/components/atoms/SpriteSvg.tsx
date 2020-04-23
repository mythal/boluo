import * as React from 'react';
import { SpriteSymbol } from '*.svg';

interface Props extends Partial<React.SVGProps<SVGSVGElement>> {
  sprite: SpriteSymbol;
}

export default function SpriteSvg(props: Props) {
  const { viewBox, url } = props.sprite;
  return (
    <svg viewBox={viewBox} {...props}>
      <use xlinkHref={url} />
    </svg>
  );
}
