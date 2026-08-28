import Eye from '@boluo/icons/Eye';
import FileDown from '@boluo/icons/FileDown';
import Paperclip from '@boluo/icons/Paperclip';
import Refresh from '@boluo/icons/Refresh';
import { showFileSize } from '@boluo/utils/files';
import clsx from 'clsx';
import type { MouseEventHandler, ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { ButtonInline } from '../ButtonInline';
import Icon from '../Icon';

export type MessageMediaLoadState = 'LOADING' | 'LOADED' | 'ERROR';

interface CommonProps {
  className?: string;
  children?: ReactNode;
}

interface ImageProps extends CommonProps {
  type: 'IMAGE';
  src: string;
  alt: string;
  loadState: MessageMediaLoadState;
  onLoad?: () => void;
  onError?: () => void;
  onRetry?: () => void;
  onPreview: MouseEventHandler<HTMLButtonElement>;
}

interface AttachmentProps extends CommonProps {
  type: 'ATTACHMENT';
  name: string;
  size?: number;
  mimeType?: string;
  downloadHref?: string;
  onPreview?: MouseEventHandler<HTMLButtonElement>;
}

interface StatusProps extends CommonProps {
  type: 'LOADING' | 'ERROR';
  onRetry?: () => void;
}

export type MessageMediaDisplayProps = ImageProps | AttachmentProps | StatusProps;

const stopPointerDown: React.PointerEventHandler<HTMLElement> = (event) => {
  event.stopPropagation();
};

const Status = ({ type, onRetry }: Pick<StatusProps, 'type' | 'onRetry'>) => {
  const intl = useIntl();
  if (type === 'LOADING') {
    return (
      <div
        className="bg-surface-interactive-active flex h-24 w-24 animate-pulse items-center justify-center rounded-sm"
        aria-label={intl.formatMessage({ defaultMessage: 'Loading media' })}
      >
        <Icon icon={Refresh} />
      </div>
    );
  }
  if (onRetry == null) {
    return (
      <div
        className="bg-state-danger-bg flex h-24 w-24 items-center justify-center rounded-sm"
        aria-label={intl.formatMessage({ defaultMessage: 'Failed to load media' })}
      >
        <Icon icon={Refresh} />
      </div>
    );
  }
  return (
    <button
      type="button"
      className="bg-state-danger-bg flex h-24 w-24 cursor-pointer items-center justify-center rounded-sm"
      onClick={onRetry}
      onPointerDown={stopPointerDown}
      aria-label={intl.formatMessage({ defaultMessage: 'Retry loading media' })}
    >
      <Icon icon={Refresh} />
    </button>
  );
};

const Image = ({ src, alt, loadState, onLoad, onError, onRetry, onPreview }: ImageProps) => {
  if (loadState === 'ERROR') {
    return <Status type="ERROR" onRetry={onRetry} />;
  }
  return (
    <div
      className={clsx(
        'h-24 rounded-sm',
        loadState === 'LOADING' &&
          'bg-surface-interactive-active w-24 animate-pulse overflow-hidden',
      )}
    >
      <button
        type="button"
        className="block h-full w-fit cursor-zoom-in overflow-hidden rounded-sm"
        onClick={onPreview}
        onPointerDown={stopPointerDown}
      >
        <img
          src={src}
          alt={alt}
          className={clsx('block h-full rounded-sm', loadState === 'LOADING' && 'opacity-0')}
          onError={onError}
          onLoad={onLoad}
        />
      </button>
    </div>
  );
};

const Attachment = ({ name, size, mimeType, downloadHref, onPreview }: AttachmentProps) => (
  <div className="bg-surface-default border-border-default flex min-h-24 w-full max-w-md flex-col justify-between gap-2 rounded border px-3 py-2">
    <div className="flex min-w-0 items-start gap-2">
      <span className="text-text-muted mt-0.5 shrink-0 text-lg">
        <Icon icon={Paperclip} />
      </span>
      <div className="min-w-0 grow">
        <div className="text-text-primary overflow-hidden font-mono text-ellipsis whitespace-nowrap">
          {name}
        </div>
        <div className="text-text-secondary mt-0.5 flex flex-wrap gap-x-2 text-xs">
          {mimeType && <span>{mimeType}</span>}
          {size != null && <span>{showFileSize(size)}</span>}
        </div>
      </div>
    </div>
    {(onPreview != null || downloadHref != null) && (
      <div className="flex justify-end gap-2">
        {onPreview != null && (
          <ButtonInline className="gap-1" onClick={onPreview} onPointerDown={stopPointerDown}>
            <Icon icon={Eye} />
            <FormattedMessage defaultMessage="Preview" />
          </ButtonInline>
        )}
        {downloadHref != null && (
          <a
            href={downloadHref}
            className="ButtonInline text-text-primary bg-action-secondary-bg shadow-action-secondary-border border-action-secondary-border hover:bg-action-secondary-bg-hover inline-flex cursor-pointer items-center justify-center gap-1 rounded-sm border px-[0.5em] py-0.5 text-[80%] shadow-[0_-1px_0_0_inset] transition-shadow duration-100"
            onPointerDown={stopPointerDown}
          >
            <Icon icon={FileDown} />
            <FormattedMessage defaultMessage="Download" />
          </a>
        )}
      </div>
    )}
  </div>
);

export const MessageMediaDisplay = (props: MessageMediaDisplayProps) => {
  const { className, children } = props;
  let content: ReactNode;
  switch (props.type) {
    case 'IMAGE':
      content = <Image {...props} />;
      break;
    case 'ATTACHMENT':
      content = <Attachment {...props} />;
      break;
    case 'LOADING':
    case 'ERROR':
      content = <Status type={props.type} onRetry={props.onRetry} />;
      break;
  }
  return (
    <div className={clsx('MessageMediaDisplay relative w-fit max-w-full', className)}>
      {content}
      {children}
    </div>
  );
};
