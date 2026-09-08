import { componentRefsMatch } from '@boluo/components/ref';
import { readCounterReportItem } from '@boluo/components/counter';
import type {
  ComponentReport,
  ComponentSnapshot,
  ComponentChangePreview,
  ComponentReportEntity,
} from '@boluo/api';
import { FormattedMessage, useIntl } from 'react-intl';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import clsx from 'clsx';
import Variable from '@boluo/icons/Variable';
import Trash from '@boluo/icons/Trash';
import Icon from '../Icon';
import { Result } from './Result';
import { Spinner } from '../Spinner';
import { useCopyText } from '../hooks/useCopyText';
import { useFloatingSetters } from '../hooks/useFloatingSetters';
import { TooltipBox } from '../TooltipBox';

export const EntryName = ({
  entryKey,
  displayName,
}: {
  entryKey: string;
  displayName?: string;
}) => {
  const intl = useIntl();
  const { copied, copy } = useCopyText();
  const { refs, floatingStyles } = useFloating({
    open: copied,
    placement: 'top',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const { setReference, setFloating } = useFloatingSetters(refs);
  return (
    <>
      <button
        type="button"
        ref={setReference}
        className="focus-visible:outline-border-focus min-w-0 cursor-pointer rounded-sm text-left wrap-break-word hover:underline focus-visible:outline-2"
        title={intl.formatMessage({ defaultMessage: 'Click to copy' })}
        aria-label={intl.formatMessage(
          { defaultMessage: 'Copy entry key {key}' },
          { key: entryKey },
        )}
        onClick={(event) => {
          event.stopPropagation();
          void copy(entryKey);
        }}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        {displayName || entryKey}
        {displayName && displayName !== entryKey && (
          <span className="text-text-muted ml-1">({entryKey})</span>
        )}
      </button>
      <TooltipBox defaultStyle show={copied} ref={setFloating} style={floatingStyles} role="status">
        <FormattedMessage defaultMessage="Copied" />
      </TooltipBox>
    </>
  );
};

const CounterDelta = ({ before, after }: { before: number | null; after: number }) => {
  if (before == null || before === after) return null;
  const delta = after - before;
  return (
    <span className="text-text-muted ml-1">
      ({delta > 0 ? '+' : ''}
      {delta})
    </span>
  );
};

export interface EntityComponentReportProps {
  entity: ComponentReportEntity;
  source?: string;
  scopeNames?: Readonly<Partial<Record<string, string>>>;
  /** Actual committed history. Estimates are carried by ChangePreview entities. */
  changes?: ComponentChangePreview[];
  preview?: boolean;
  /** Loading state of committed history for Change reports. */
  loadState?: 'ready' | 'loading' | 'error';
}

const reportForScope = (report: ComponentReport, scopeId: string): ComponentReport => {
  switch (report.type) {
    case 'Change':
      return { ...report, items: report.items.filter((item) => item.scopeId === scopeId) };
    case 'Snapshot':
      return {
        ...report,
        items: report.items.filter((item) => item.component.scopeId === scopeId),
      };
    case 'ChangePreview':
      return {
        ...report,
        items: report.items.filter((item) => item.component.scopeId === scopeId),
      };
  }
};

const ReportStatus = ({ status }: { status: 'loading' | 'error' | 'unconfirmed' }) => {
  const intl = useIntl();
  if (status === 'loading') {
    return (
      <span title={intl.formatMessage({ defaultMessage: 'Loading result…' })}>
        <Spinner />
        <span className="sr-only">
          <FormattedMessage defaultMessage="Loading result…" />
        </span>
      </span>
    );
  }
  if (status === 'error') {
    const label = intl.formatMessage({ defaultMessage: 'Could not load component changes.' });
    return (
      <span title={label} aria-label={label}>
        <FormattedMessage defaultMessage="Failed" />
      </span>
    );
  }
  const label = intl.formatMessage({ defaultMessage: 'Change not confirmed' });
  return (
    <span title={label} aria-label={label}>
      <FormattedMessage defaultMessage="Unconfirmed" />
    </span>
  );
};

export const EntityComponentReport = (props: EntityComponentReportProps) => {
  const { entity, scopeNames } = props;
  const { report } = entity;
  const scopeIds = [
    ...new Set(
      report.items.map((item) => ('component' in item ? item.component.scopeId : item.scopeId)),
    ),
  ];
  if (scopeIds.length === 0) return <ComponentReportGroup {...props} />;
  return (
    <span className="inline-flex max-w-full flex-wrap items-start gap-2 align-middle">
      {scopeIds.map((scopeId) => {
        return (
          <ComponentReportGroup
            key={scopeId}
            {...props}
            entity={{ ...entity, report: reportForScope(report, scopeId) }}
            scopeName={scopeNames?.[scopeId]}
          />
        );
      })}
    </span>
  );
};

const ComponentReportRow = ({
  component,
}: {
  component: ComponentSnapshot | ComponentChangePreview;
}) => {
  const intl = useIntl();
  const item = readCounterReportItem(component);
  const { component: target } = component;
  const snapshot = 'payload' in component;
  if (!item)
    return (
      <span
        className="text-text-muted col-span-3"
        title={intl.formatMessage({ defaultMessage: 'Unsupported component' })}
        aria-label={intl.formatMessage({ defaultMessage: 'Unsupported component' })}
      >
        <FormattedMessage defaultMessage="Unsupported" />
      </span>
    );
  return (
    <span className="contents">
      <span className="inline-flex min-w-0 items-center gap-1 pr-3">
        <EntryName entryKey={target.key} displayName={component.displayName} />
      </span>
      <span className="contents font-mono tabular-nums">
        {item.after == null ? (
          <span className="text-text-muted col-span-2 inline-flex items-center justify-end gap-1 font-sans text-xs">
            <Icon icon={Trash} />
            <FormattedMessage defaultMessage="Deleted" />
          </span>
        ) : (
          <>
            <span
              className={clsx(
                'text-right whitespace-nowrap',
                item.after.max == null && 'col-span-2',
              )}
            >
              <Result final noEqual>
                {item.after.value}
              </Result>
              {!snapshot && (
                <CounterDelta before={item.before?.value ?? null} after={item.after.value} />
              )}
              {!snapshot && item.before == null && (
                <span className="text-text-muted font-sans text-xs">
                  {' '}
                  (<FormattedMessage defaultMessage="Created" />)
                </span>
              )}
            </span>
            {item.after.max != null && (
              <span className="text-text-muted whitespace-nowrap">
                {' / '}
                {item.after.max}
                {!snapshot && (
                  <CounterDelta before={item.before?.max ?? null} after={item.after.max} />
                )}
              </span>
            )}
          </>
        )}
      </span>
    </span>
  );
};

const ComponentReportGroup = ({
  entity,
  source,
  changes,
  loadState = 'ready',
  preview = false,
  scopeName,
}: EntityComponentReportProps & { scopeName?: string }) => {
  const snapshot = entity.report.type === 'Snapshot';
  const references = entity.report.type === 'Change' ? entity.report.items : [];
  const resolved = (changes ?? []).filter((change) =>
    references.some((reference) => componentRefsMatch(reference, change.component)),
  );
  const missing = references.filter(
    (target) => !resolved.some((change) => componentRefsMatch(target, change.component)),
  );
  const items = entity.report.type === 'Change' ? resolved : entity.report.items;
  const countersOnly = [...references, ...items.map((item) => item.component)].every(
    (target) => target.componentType === 'core/counter',
  );
  let state: 'loading' | 'error' | 'unconfirmed' | undefined;
  if (entity.report.type === 'Change') {
    if (loadState !== 'ready') state = loadState;
    else if (missing.length > 0) state = 'unconfirmed';
  }

  let title;
  if (scopeName) {
    title = <span className="min-w-0 wrap-break-word">{scopeName}</span>;
  } else if (!countersOnly) {
    title = <FormattedMessage defaultMessage="Components" />;
  } else if (snapshot) {
    title = <FormattedMessage defaultMessage="Counters" />;
  } else {
    title = <FormattedMessage defaultMessage="Counter update" />;
  }
  return (
    <span
      className="EntityComponentReport font-ui bg-surface-raised border-border-strong text-text-primary inline-flex max-w-full min-w-36 flex-col overflow-hidden rounded-sm border align-middle text-sm whitespace-normal not-italic shadow-sm"
      title={source?.slice(entity.start, entity.start + entity.len)}
    >
      <span className="bg-surface-muted text-text-secondary border-border-default flex items-center gap-1.5 border-b px-2 py-1 text-xs">
        <Icon icon={Variable} />
        {title}
        {(preview || entity.report.type === 'ChangePreview') && (
          <span className="text-text-muted ml-1">
            <FormattedMessage defaultMessage="Preview" />
          </span>
        )}
        {snapshot && <span className="ml-auto pl-3 tabular-nums">{items.length}</span>}
      </span>
      {(items.length > 0 || state) && (
        <span className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-2">
          {items.map((item, index) => {
            const { component } = item;
            // A report can contain several changes to the same component.
            const key = `${component.scopeId}:${component.entryId ?? component.key}:${component.componentType}:${index}`;
            return (
              <span
                key={key}
                className="even:bg-surface-muted col-span-3 grid grid-cols-subgrid items-baseline px-2 py-1"
              >
                <ComponentReportRow component={item} />
              </span>
            );
          })}
          {state &&
            (missing.length ? missing : [null]).map((reference) => (
              <span
                className="even:bg-surface-muted col-span-3 grid grid-cols-subgrid items-baseline px-2 py-1"
                key={
                  reference
                    ? `${reference.scopeId}:${reference.entryId ?? reference.key}:${reference.componentType}`
                    : 'status'
                }
              >
                <span className="min-w-0 pr-3 wrap-break-word">{reference?.key}</span>
                <span
                  role="status"
                  className="text-text-muted col-span-2 inline-flex items-center justify-end text-right"
                >
                  <ReportStatus status={state} />
                </span>
              </span>
            ))}
        </span>
      )}
      {entity.report.items.length === 0 && !state && (
        <span className="text-text-muted px-2 py-2">
          <FormattedMessage defaultMessage="No components." />
        </span>
      )}
    </span>
  );
};
