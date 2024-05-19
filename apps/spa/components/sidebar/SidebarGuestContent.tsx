import { FC } from 'react';
import { Todo } from '../common/Todo';

export const SidebarGuestContent: FC = () => {
  return (
    <div>
      <div className="p-4">
        <Todo>Introduce the guest to example spaces</Todo>
      </div>
    </div>
  );
};
