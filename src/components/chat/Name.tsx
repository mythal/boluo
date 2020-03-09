import React, { useRef, useState } from 'react';
import { cls } from '../../classname';
import { UserCard } from './UserCard';

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
        <span ref={ref} className="inline-block hover:underline cursor-pointer">
          {name}
        </span>
        <UserCard open={open} dismiss={dismiss} anchor={ref} id={userId} r />
      </span>
    </>
  );
});
