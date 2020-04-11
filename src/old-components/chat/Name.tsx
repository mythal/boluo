import React, { useRef, useState } from 'react';
import { UserCard } from './UserCard';
import { cls } from '../../utils';

interface Props {
  name: string;
  userId: string;
  className?: string;
}

export const Name = React.memo<Props>(({ name, className, userId }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const dismiss = () => setOpen(false);

  return (
    <>
      <span className={cls('font-bold', className)} onClick={() => setOpen(true)}>
        <span ref={ref} className="inline-block hover:underline cursor-pointer break-all">
          {name}
        </span>
        <UserCard open={open} dismiss={dismiss} anchor={ref} id={userId} r />
      </span>
    </>
  );
});
