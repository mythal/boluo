import { FlexibleStar } from 'icons';
import { FC } from 'react';
import { CocRoll, CocRollResult } from '../../interpreter/entities';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';
import { RollBox } from './RollBox';

interface Props {
  node: CocRoll | CocRollResult;
}

export const EntityExprCocRoll: FC<Props> = ({ node }) => {
  return (
    <RollBox>
      <Delay fallback={<FallbackIcon />}>
        <FlexibleStar className="inline w-4 h-4" />
      </Delay>
    </RollBox>
  );
};
