import { type Proxy } from '@boluo/api';
import clsx from 'clsx';
import Cloud from '@boluo/icons/Cloud';
import Unplug from '@boluo/icons/Unplug';
import Icon from '@boluo/ui/Icon';
import { type FC, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { type BaseUrlTestResult } from '../../base-url';

interface Props {
  proxy: Proxy;
  result: BaseUrlTestResult['rtt'] | null | undefined;
  score: number;
  selected: boolean;
  setUrl: (url: string) => void;
}

export const BaseUrlSelectorItem: FC<Props> = ({ proxy, result, score, setUrl, selected }) => {
  const { url, name, region } = proxy;
  let resultNode: ReactNode = <span>...</span>;
  let icon: typeof Cloud = Cloud;
  if (result === 'FAILED') {
    resultNode = (
      <span className="text-state-danger-text">
        <FormattedMessage defaultMessage="Failed" />
      </span>
    );
    icon = Unplug;
  } else if (result === 'TIMEOUT') {
    resultNode = (
      <span className="text-text-muted">
        <FormattedMessage defaultMessage="Timeout" />
      </span>
    );
    icon = Unplug;
  } else if (typeof result === 'number') {
    resultNode = <span className="text-text-secondary">{result.toFixed(0)} ms</span>;
  }
  return (
    <button
      type="button"
      onClick={() => setUrl(url)}
      className={clsx(
        'group relative grid w-full cursor-pointer grid-cols-[1.25rem_1fr_auto] grid-rows-[auto_auto] items-start gap-x-2 gap-y-1 rounded px-1 py-2 text-sm',
        selected ? 'bg-sidebar-item-active-bg' : 'hover:bg-sidebar-item-hover-bg',
      )}
      aria-pressed={selected}
      title={url}
    >
      <span
        className={clsx(
          'flex h-5 w-5 items-center justify-center',
          selected ? 'text-text-secondary' : 'text-text-subtle group-hover:text-text-secondary',
        )}
      >
        <Icon icon={Cloud} />
      </span>
      <div className="min-w-0">
        <div className="truncate text-left font-semibold">
          {name}
          {region && <span className="text-text-muted ml-1 text-xs">({region})</span>}
        </div>
      </div>
      <div className="text-right text-xs">{resultNode}</div>

      <div className="text-text-muted col-start-2 truncate text-left font-mono text-xs">
        <FormattedMessage defaultMessage="Score: {score}" values={{ score: score.toFixed(0) }} />
      </div>
    </button>
  );
};
