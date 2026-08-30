import * as React from 'react';
import { Link } from 'react-router-dom';
import PlusCircle from '@boluo/icons/legacy/PlusCircle';
import Icon from '../atoms/Icon';

function NewSpaceCard() {
  return (
    <Link
      className="bg-legacy-new-space-background text-legacy-sidebar-item hover:bg-legacy-card-background flex items-center justify-center rounded-[1px] py-4 text-[1.875rem] no-underline"
      to="/space/new"
    >
      <Icon icon={PlusCircle} />
    </Link>
  );
}

export default NewSpaceCard;
