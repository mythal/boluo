import { mediaUrl } from '@boluo/api-browser';
import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';
import { useQueryMediaInfo } from '@boluo/hooks/useQueryMediaInfo';
import {
  MessageMediaDisplay,
  type MessageMediaLoadState,
} from '@boluo/ui/chat/MessageMediaDisplay';
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { useIntl } from 'react-intl';
import { usePaneLimit } from '../../hooks/useMaxPane';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import { usePaneKey } from '../../hooks/usePaneKey';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { getMediaUrl, supportedImageMediaTypes } from '../../media';
import { type ImagePreviewSource, useImagePreview } from './ImagePreviewOverlay';

type Props = {
  className?: string;
  media: File | string;
  children?: ReactNode;
};

interface ImageMediaProps {
  src: string;
  previewSource: ImagePreviewSource;
  className?: string;
  children?: ReactNode;
}

const ImageMedia = ({ src, previewSource, className, children }: ImageMediaProps) => {
  const intl = useIntl();
  const { open } = useImagePreview();
  const [loadState, setLoadState] = useState<MessageMediaLoadState>('LOADING');
  const handlePreview = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      open(previewSource);
    },
    [open, previewSource],
  );
  return (
    <MessageMediaDisplay
      type="IMAGE"
      className={className}
      src={src}
      alt={intl.formatMessage({ defaultMessage: 'Message attachment' })}
      loadState={loadState}
      onLoad={() => setLoadState('LOADED')}
      onError={() => setLoadState('ERROR')}
      onRetry={() => setLoadState('LOADING')}
      onPreview={handlePreview}
    >
      {children}
    </MessageMediaDisplay>
  );
};

const LocalMessageMedia = ({
  media,
  className,
  children,
}: Omit<Props, 'media'> & { media: File }) => {
  const isImage = supportedImageMediaTypes.includes(media.type);
  const objectUrl = useObjectUrl(isImage ? media : null);
  const previewSource = useMemo<ImagePreviewSource>(() => ({ type: 'BLOB', blob: media }), [media]);
  if (isImage) {
    if (objectUrl == null) {
      return (
        <MessageMediaDisplay type="LOADING" className={className}>
          {children}
        </MessageMediaDisplay>
      );
    }
    return (
      <ImageMedia
        key={objectUrl}
        src={objectUrl}
        previewSource={previewSource}
        className={className}
      >
        {children}
      </ImageMedia>
    );
  }
  return (
    <MessageMediaDisplay
      type="ATTACHMENT"
      className={className}
      name={media.name}
      size={media.size}
      mimeType={media.type || undefined}
    >
      {children}
    </MessageMediaDisplay>
  );
};

const RemoteImageMedia = ({
  mediaId,
  className,
  children,
}: Omit<Props, 'media'> & { mediaId: string }) => {
  const {
    data: appSettings,
    error: appSettingsError,
    isLoading: isLoadingAppSettings,
    mutate: reloadAppSettings,
  } = useQueryAppSettings();
  const src = appSettings?.mediaUrl ? getMediaUrl(appSettings.mediaUrl, mediaId) : null;
  if (src == null) {
    return (
      <MessageMediaDisplay
        type={isLoadingAppSettings && appSettingsError == null ? 'LOADING' : 'ERROR'}
        className={className}
        onRetry={() => void reloadAppSettings()}
      >
        {children}
      </MessageMediaDisplay>
    );
  }
  return (
    <ImageMedia key={src} src={src} previewSource={{ type: 'URL', url: src }} className={className}>
      {children}
    </ImageMedia>
  );
};

interface RemoteAttachmentMediaProps extends Omit<Props, 'media'> {
  mediaId: string;
  name: string;
  size: number;
  mimeType: string;
}

const RemoteAttachmentMedia = ({
  mediaId,
  name,
  size,
  mimeType,
  className,
  children,
}: RemoteAttachmentMediaProps) => {
  const paneKey = usePaneKey();
  const maxPane = usePaneLimit();
  const togglePane = usePaneToggle();
  const handlePdfPreview = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      togglePane(
        { type: 'MEDIA_PREVIEW', mediaId },
        paneKey == null ? 'TAIL' : { refKey: paneKey },
      );
    },
    [mediaId, paneKey, togglePane],
  );
  return (
    <MessageMediaDisplay
      type="ATTACHMENT"
      className={className}
      name={name}
      size={size}
      mimeType={mimeType}
      downloadHref={mediaUrl(mediaId, true)}
      onPreview={mimeType === 'application/pdf' && maxPane > 1 ? handlePdfPreview : undefined}
    >
      {children}
    </MessageMediaDisplay>
  );
};

const RemoteMessageMedia = ({
  mediaId,
  className,
  children,
}: Omit<Props, 'media'> & { mediaId: string }) => {
  const intl = useIntl();
  const { data: mediaInfo, error: mediaInfoError } = useQueryMediaInfo(mediaId);

  if (mediaInfo == null) {
    if (mediaInfoError == null) {
      return (
        <MessageMediaDisplay type="LOADING" className={className}>
          {children}
        </MessageMediaDisplay>
      );
    }
    return (
      <MessageMediaDisplay
        type="ATTACHMENT"
        className={className}
        name={intl.formatMessage({ defaultMessage: 'Attachment' })}
        downloadHref={mediaUrl(mediaId, true)}
      >
        {children}
      </MessageMediaDisplay>
    );
  }

  if (supportedImageMediaTypes.includes(mediaInfo.mimeType)) {
    return (
      <RemoteImageMedia mediaId={mediaId} className={className}>
        {children}
      </RemoteImageMedia>
    );
  }

  return (
    <RemoteAttachmentMedia
      mediaId={mediaId}
      className={className}
      name={mediaInfo.originalFilename}
      size={mediaInfo.size}
      mimeType={mediaInfo.mimeType}
    >
      {children}
    </RemoteAttachmentMedia>
  );
};

export const MessageMedia = memo<Props>(({ media, className, children = null }) => {
  if (media instanceof File) {
    return (
      <LocalMessageMedia media={media} className={className}>
        {children}
      </LocalMessageMedia>
    );
  }
  return (
    <RemoteMessageMedia mediaId={media} className={className}>
      {children}
    </RemoteMessageMedia>
  );
});

MessageMedia.displayName = 'MessageMedia';
