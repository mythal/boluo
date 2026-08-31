import * as React from 'react';
import { Link } from 'react-router-dom';
import { type Space } from '../../api/spaces';
import Lock from '@boluo/icons/legacy/Lock';
import { encodeUuid } from '../../utils/id';
import Icon from '../atoms/Icon';

interface Props {
  space: Space;
}

function truncate(description: string): string {
  const length = 32;
  const firstLine = description.split(/\r?\n/, 1)[0];
  if (firstLine.length > length) {
    return firstLine.substr(0, length) + '…';
  }
  return firstLine;
}

function SpaceCard({ space }: Props) {
  return (
    <Link
      className="bg-legacy-card-background text-legacy-text shadow-legacy-ui hover:bg-legacy-card-hover min-h-32 rounded-[1px] [background-size:60%] bg-[position:right_bottom] bg-no-repeat px-3 py-5 no-underline [text-shadow:0_1px_1px_#000]"
      to={`/space/${encodeUuid(space.id)}`}
    >
      <h2 className="m-0 p-0 text-[1.25rem] font-normal not-italic">
        {!space.isPublic && <Icon className="mr-1" icon={Lock} />}
        {space.name}
      </h2>
      <div className="mt-2">
        <small>{truncate(space.description)}</small>
      </div>
    </Link>
  );
}

export default SpaceCard;
