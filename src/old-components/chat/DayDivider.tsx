import React from 'react';

interface Props {
  date: Date;
}

export const DayDivider = React.memo<Props>(({ date }) => {
  return (
    <div className="text-center font-serif italic">
      {date.getFullYear()} - {date.getMonth() + 1} - {date.getDate()}
    </div>
  );
});
