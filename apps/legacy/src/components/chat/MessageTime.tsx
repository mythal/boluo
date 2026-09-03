import * as React from 'react';
import { parseDateString } from '../../utils/helper';
import { dateTimeFormat, timeFormat } from '../../utils/time';

interface Props {
  created: string;
  modified: string;
}

function MessageTime(props: Props) {
  const created = parseDateString(props.created);
  const modified = parseDateString(props.modified);
  return (
    <time className="group/message-time font-legacy-mono text-legacy-gray-600 relative float-right clear-right ml-1 text-[0.75rem] font-normal not-italic">
      <div className="bg-legacy-black shadow-legacy-ui invisible absolute right-0 bottom-0 z-10 w-max rounded-[3px] px-2 py-1 text-[0.875rem] font-normal text-white not-italic group-hover/message-time:visible">
        <div>{dateTimeFormat(created)}</div>
        {props.created !== props.modified && (
          <div className="text-[0.75rem]">修改于 {dateTimeFormat(modified)}</div>
        )}
      </div>
      {timeFormat(created)}
    </time>
  );
}

export default MessageTime;
