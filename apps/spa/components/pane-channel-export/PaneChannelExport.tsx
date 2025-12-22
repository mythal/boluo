import { FormattedMessage, useIntl } from 'react-intl';
import { useQueryChannel } from '@boluo/hooks/useQueryChannel';
import { Failed } from '@boluo/ui/Failed';
import { type FC, type ReactNode, useId, useRef, useState } from 'react';
import { Loading } from '@boluo/ui/Loading';
import { PaneBox } from '../PaneBox';
import { errorCode, type Channel } from '@boluo/api';
import { PaneHeaderBox } from '../PaneHeaderBox';
import Check from '@boluo/icons/Check';
import ScrollText from '@boluo/icons/ScrollText';
import { Select } from '@boluo/ui/Select';
import { Button } from '@boluo/ui/Button';
import Icon from '@boluo/ui/Icon';
import { Spinner } from '@boluo/ui/Spinner';
import * as Sentry from '@sentry/browser';
import { PaneFooterBox } from '../PaneFooterBox';
import { type ExportOptions, exportChannel } from './export';
import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';

export interface ExportSchema {
  format: string;
  range: string;
  includeOutGame: boolean;
  includeArchived: boolean;
  simple: boolean;
  splitByLineBreak: boolean;
}

const defaultValues = {
  format: 'txt' as const,
  range: '7d' as const,
  includeOutGame: true,
  includeArchived: false,
  simple: false,
  splitByLineBreak: false,
} satisfies ExportSchema;

const parseExportOptions = (schema: ExportSchema): ExportOptions => {
  let format: ExportOptions['format'] = defaultValues.format;
  let range: ExportOptions['range'] = defaultValues.range;
  switch (schema.format) {
    case 'txt':
    case 'csv':
    case 'bbcode':
    case 'json':
      format = schema.format;
      break;
  }
  switch (schema.range) {
    case '30d':
    case '7d':
    case '1d':
    case 'all':
      range = schema.range;
      break;
  }
  return { ...schema, format, range };
};

const ExportForm: FC<{ channel: Channel }> = ({ channel }) => {
  const intl = useIntl();
  const id = useId();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const { data: appSettings } = useQueryAppSettings();
  const mediaUrl = appSettings?.mediaUrl;
  const [error, setError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);
  const [formData, setFormData] = useState<ExportSchema>(defaultValues);

  const handleInputChange = (field: keyof ExportSchema, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!mediaUrl) {
      alert('MEDIA_URL is not set.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    setIsSubmitSuccessful(false);
    const exportOptions = parseExportOptions(formData);
    try {
      const { blob, filename } = await exportChannel(intl, mediaUrl, channel, exportOptions);
      const url = URL.createObjectURL(blob);
      const link = linkRef.current;
      if (!link) {
        // This should never happen, but it happened.
        alert('Failed to create download link, please try again.');
        return;
      }
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setIsSubmitSuccessful(true);
    } catch (error) {
      setError(error);
      Sentry.captureException(error, { extra: { channel, options: formData } });
    } finally {
      setIsSubmitting(false);
    }
  };

  let exportButtonIcon: ReactNode = <Icon icon={ScrollText} />;
  if (isSubmitting) {
    exportButtonIcon = <Spinner />;
  } else if (isSubmitSuccessful && error == null) {
    exportButtonIcon = <Icon icon={Check} />;
  }

  return (
    <form className="ExportForm" onSubmit={onSubmit}>
      <a hidden ref={linkRef} />
      <div className="p-pane mx-auto grid max-w-screen-sm grid-cols-[auto_1fr] items-baseline gap-2">
        {error != null && (
          <div className="bg-state-warning-bg col-span-full rounded-sm px-4 py-2">
            <Failed
              code={errorCode(error)}
              title={<FormattedMessage defaultMessage="Failed to export the channel" />}
            />
          </div>
        )}
        <label htmlFor={id + 'format'} className="justify-self-end select-none">
          <FormattedMessage defaultMessage="Format" />
        </label>
        <Select
          id={id + 'format'}
          value={formData.format}
          onChange={(e) => handleInputChange('format', e.target.value)}
        >
          <option value="txt">
            <FormattedMessage defaultMessage="Plain Text" />
          </option>
          <option value="bbcode">BBCode</option>
          <option value="csv">
            <FormattedMessage defaultMessage="Spreadsheet" /> (CSV)
          </option>
          <option value="json">JSON</option>
        </Select>
        <label htmlFor={id + 'range'} className="justify-self-end select-none">
          <FormattedMessage defaultMessage="Time Range" />
        </label>
        <Select
          id={id + 'range'}
          value={formData.range}
          onChange={(e) => handleInputChange('range', e.target.value)}
        >
          <option value="30d">
            <FormattedMessage defaultMessage="Last {day} days" values={{ day: 30 }} />
          </option>
          <option value="7d">
            <FormattedMessage defaultMessage="Last {day} days" values={{ day: 7 }} />
          </option>
          <option value="1d">
            <FormattedMessage defaultMessage="Last 1 day" />
          </option>
          <option value="all">
            <FormattedMessage defaultMessage="All" />
          </option>
        </Select>
        <input
          id={id + 'archived'}
          type="checkbox"
          className="justify-self-end"
          checked={formData.includeArchived}
          onChange={(e) => handleInputChange('includeArchived', e.target.checked)}
        />
        <label className="select-none" htmlFor={id + 'archived'}>
          <FormattedMessage defaultMessage="Include archived messages" />
        </label>
        <input
          id={id + 'out-game'}
          type="checkbox"
          className="justify-self-end"
          checked={formData.includeOutGame}
          onChange={(e) => handleInputChange('includeOutGame', e.target.checked)}
        />
        <label htmlFor={id + 'out-game'} className="select-none">
          <FormattedMessage defaultMessage="Include out-of-game messages" />
        </label>
        <input
          id={id + 'simple'}
          type="checkbox"
          className="justify-self-end"
          checked={formData.simple}
          disabled={formData.format !== 'txt' && formData.format !== 'bbcode'}
          onChange={(e) => handleInputChange('simple', e.target.checked)}
        />
        <label htmlFor={id + 'simple'} className="select-none">
          <FormattedMessage defaultMessage="Without rich-text information" />
        </label>
        <input
          id={id + 'split'}
          type="checkbox"
          className="justify-self-end"
          checked={formData.splitByLineBreak}
          disabled={formData.format !== 'txt' && formData.format !== 'bbcode'}
          onChange={(e) => handleInputChange('splitByLineBreak', e.target.checked)}
        />
        <label htmlFor={id + 'split'} className="select-none">
          <FormattedMessage defaultMessage="Split the message into multiple ones at line breaks" />
        </label>
      </div>
      <PaneFooterBox>
        <Button type="button">
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button type="submit" variant="primary">
          {exportButtonIcon}
          <FormattedMessage defaultMessage="Export" />
        </Button>
      </PaneFooterBox>
    </form>
  );
};

export const PaneChannelExport: FC<{ channelId: string }> = ({ channelId }) => {
  const { data: channel, error } = useQueryChannel(channelId);
  if (error && channel == null) {
    return (
      <PaneBox
        header={
          <PaneHeaderBox icon={<ScrollText />}>
            <FormattedMessage defaultMessage="Export Channel" />
          </PaneHeaderBox>
        }
      >
        <div className="p-pane">
          <Failed
            code={errorCode(error)}
            title={<FormattedMessage defaultMessage="Failed to query the channel" />}
          />
        </div>
      </PaneBox>
    );
  } else if (!channel) {
    return <Loading />;
  }
  return (
    <PaneBox header={<PaneChannelExportHeader channel={channel} />}>
      <ExportForm channel={channel} />
    </PaneBox>
  );
};

const PaneChannelExportHeader: FC<{ channel: Channel }> = ({ channel }) => {
  return (
    <PaneHeaderBox icon={<ScrollText />}>
      <span className="overflow-hidden overflow-ellipsis whitespace-nowrap">
        <FormattedMessage
          defaultMessage='Export "{channelName}"'
          values={{ channelName: channel.name }}
        />
      </span>
    </PaneHeaderBox>
  );
};
