import { errorCode } from '@boluo/api';
import { mediaUrl } from '@boluo/api-browser';
import ExternalLink from '@boluo/icons/ExternalLink';
import FileDown from '@boluo/icons/FileDown';
import Paperclip from '@boluo/icons/Paperclip';
import { useQueryMediaInfo } from '@boluo/hooks/useQueryMediaInfo';
import { Failed } from '@boluo/ui/Failed';
import { Loading } from '@boluo/ui/Loading';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import type { FC, ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';

interface Props {
  mediaId: string;
}

const openUrl = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const PaneMediaPreview: FC<Props> = ({ mediaId }) => {
  const intl = useIntl();
  const { data: media, error } = useQueryMediaInfo(mediaId);
  const previewUrl = mediaUrl(mediaId);
  const downloadUrl = mediaUrl(mediaId, true);
  const title = media?.originalFilename ?? intl.formatMessage({ defaultMessage: 'Media preview' });
  const operators = (
    <>
      <PaneHeaderButton
        icon={<ExternalLink />}
        aria-label={intl.formatMessage({ defaultMessage: 'Open in a new tab' })}
        onClick={() => openUrl(previewUrl)}
      />
      <PaneHeaderButton
        icon={<FileDown />}
        aria-label={intl.formatMessage({ defaultMessage: 'Download' })}
        onClick={() => openUrl(downloadUrl)}
      />
    </>
  );

  let body: ReactNode;
  if (error != null && media == null) {
    body = (
      <div className="p-pane">
        <Failed
          code={errorCode(error)}
          title={<FormattedMessage defaultMessage="Failed to load media information" />}
        />
      </div>
    );
  } else if (media == null) {
    body = (
      <div className="flex h-full items-center justify-center">
        <Loading />
      </div>
    );
  } else if (media.mimeType !== 'application/pdf') {
    body = (
      <div className="p-pane">
        <Failed
          title={<FormattedMessage defaultMessage="This file cannot be previewed as PDF" />}
        />
      </div>
    );
  } else {
    body = <iframe className="h-full w-full border-0" src={previewUrl} title={title} />;
  }

  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<Paperclip />} operators={operators}>
          {title}
        </PaneHeaderBox>
      }
    >
      {body}
    </PaneBox>
  );
};

export default PaneMediaPreview;
