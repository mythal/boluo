import { FormattedMessage } from 'react-intl';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { Failed } from '../common/Failed';
import { FC, ReactNode, useId, useState } from 'react';
import { Loading } from '@boluo/ui/Loading';
import { PaneBox } from '../PaneBox';
import { Channel } from '@boluo/api';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { Check, ScrollText } from '@boluo/icons';
import { Select } from '@boluo/ui/Select';
import { useForm } from 'react-hook-form';
import { Button } from '@boluo/ui/Button';
import Icon from '@boluo/ui/Icon';
import { Spinner } from '@boluo/ui/Spinner';
import { sleep } from '@boluo/utils';
import * as Sentry from '@sentry/browser';
import { PaneFooterBox } from '../PaneFooterBox';

export interface ExportSchema {
  format: string;
  range: string;
  includeOutGame: boolean;
  includeArchived: boolean;
  simple: boolean;
  headerAfterLineBreak: boolean;
}

export interface ExportOptions {
  format: 'txt' | 'csv' | 'json';
  range: '30d' | '7d' | '1d' | 'all';
  includeOutGame: boolean;
  includeArchived: boolean;
  simple: boolean;
  headerAfterLineBreak: boolean;
}

const defaultValues = {
  format: 'txt' as const,
  range: '7d' as const,
  includeOutGame: true,
  includeArchived: false,
  simple: false,
  headerAfterLineBreak: false,
} satisfies ExportSchema;

const parseExportOptions = (schema: ExportSchema): ExportOptions => {
  let format: ExportOptions['format'] = defaultValues.format;
  let range: ExportOptions['range'] = defaultValues.range;
  switch (schema.format) {
    case 'txt':
    case 'csv':
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

export const exportChannel = async (channel: Channel, options: ExportOptions) => {
  await sleep(1000);
  throw new Error('Not implemented');
  return [];
};

const ExportForm: FC<{ channel: Channel }> = ({ channel }) => {
  const id = useId();
  const [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm<ExportSchema>({ defaultValues });
  const onSubmit = async (options: ExportSchema) => {
    if (isSubmitting) return;
    setError(null);
    const exportOptions = parseExportOptions(options);
    try {
      await exportChannel(channel, exportOptions);
    } catch (error) {
      setError(error);
      Sentry.captureException(error, { extra: { channel, options } });
    }
  };
  let exportButtonIcon: ReactNode = <Icon icon={ScrollText} />;
  if (isSubmitting) {
    exportButtonIcon = <Spinner />;
  } else if (isSubmitSuccessful && error == null) {
    exportButtonIcon = <Icon icon={Check} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="p-pane mx-auto grid max-w-screen-sm grid-cols-[auto_1fr] items-baseline gap-2">
        {error != null && (
          <div className="bg-failed-banner-bg col-span-full rounded-sm px-4 py-2">
            <Failed error={error} title={<FormattedMessage defaultMessage="Failed to export the channel" />} />
          </div>
        )}
        <label htmlFor={id + 'format'} className="select-none justify-self-end">
          <FormattedMessage defaultMessage="Format" />
        </label>
        <Select id={id + 'format'} {...register('format')}>
          <option value="txt">Plain Text</option>
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </Select>
        <label htmlFor={id + 'range'} className="select-none justify-self-end">
          <FormattedMessage defaultMessage="Time Range" />
        </label>
        <Select id={id + 'range'} {...register('range')}>
          <option value="30d">Last 30 days</option>
          <option value="7d">Last 7 days</option>
          <option value="1d">Last 1 day</option>
          <option value="all">All Time</option>
        </Select>
        <input id={id + 'archived'} type="checkbox" className="justify-self-end" {...register('includeArchived')} />
        <label className="select-none" htmlFor={id + 'archived'}>
          <FormattedMessage defaultMessage="Include archived messages" />
        </label>
        <input id={id + 'out-game'} type="checkbox" className="justify-self-end" {...register('includeOutGame')} />
        <label htmlFor={id + 'out-game'} className="select-none">
          <FormattedMessage defaultMessage="Include out-of-game messages" />
        </label>
        <input id={id + 'simple'} type="checkbox" className="justify-self-end" {...register('simple')} />
        <label htmlFor={id + 'simple'} className="select-none">
          <FormattedMessage defaultMessage="Without rich-text informations" />
        </label>
        <input id={id + 'header'} type="checkbox" className="justify-self-end" {...register('headerAfterLineBreak')} />
        <label htmlFor={id + 'header'} className="select-none">
          <FormattedMessage defaultMessage="Add a header after a line break in the message" />
        </label>
      </div>
      <PaneFooterBox>
        <Button type="button">
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button type="submit" data-type="primary">
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
          <Failed error={error} title={<FormattedMessage defaultMessage="Failed to query the channel" />} />
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
        <FormattedMessage defaultMessage='Export "{channelName}"' values={{ channelName: channel.name }} />
      </span>
    </PaneHeaderBox>
  );
};
