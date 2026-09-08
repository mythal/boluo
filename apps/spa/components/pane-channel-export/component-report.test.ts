import assert from 'node:assert/strict';
import test from 'node:test';
import { createIntl } from 'react-intl';
import type {
  ComponentPayload,
  ComponentReportEntity,
  EntryEffectHistory,
  Message,
} from '@boluo/api';
import { exportComponentReportText } from './component-report';
import { exportMessage, jsonBlob, txtBlob, type ExportMessage } from './export';

const baseIntl = createIntl({ locale: 'en' });
const intl = {
  ...baseIntl,
  formatMessage: ((message, values, options) =>
    baseIntl.formatMessage(
      {
        ...message,
        id:
          message.id ??
          (typeof message.defaultMessage === 'string' ? message.defaultMessage : 'test'),
      },
      values,
      options,
    )) as typeof baseIntl.formatMessage,
};
const target = { scopeId: 'scope', entryId: 'hp-id', key: 'hp', componentType: 'core/counter' };
const payload = (value: number): ComponentPayload => ({
  payloadType: 'JSON',
  schemaVersion: 1,
  data: { value, min: 0, max: 20, note: 'Keep this' },
});
const report: ComponentReportEntity = {
  start: 0,
  len: 8,
  report: { type: 'Change', items: [target] },
};
const effect: EntryEffectHistory = {
  id: 'effect',
  spaceId: 'space',
  scopeId: 'scope',
  operatorId: 'user',
  created: '2026-01-01T00:00:00Z',
  messageId: 'message',
  entryHistory: [],
  componentHistory: [
    {
      ...target,
      entryEffectId: 'effect',
      operatorId: 'user',
      created: '2026-01-01T00:00:00Z',
      action: 'SET',
      beforePayload: payload(12),
      payload: payload(9),
    },
  ],
};

test('exports committed changes by identity, without bounds and with unconfirmed targets', () => {
  const entity: ComponentReportEntity = {
    ...report,
    report: {
      type: 'Change',
      items: [
        { ...target, key: 'old-name' },
        { ...target, entryId: 'missing', key: 'mp' },
      ],
    },
  };
  const unrelated: EntryEffectHistory = {
    ...effect,
    componentHistory: effect.componentHistory.map((change) => ({
      ...change,
      scopeId: 'other-scope',
    })),
  };
  assert.equal(
    exportComponentReportText(intl, entity, [unrelated, effect]),
    'hp: 12 → 9\nmp: Change not confirmed',
  );
  assert.equal(exportComponentReportText(intl, report, []), 'hp: Change not confirmed');
});

test('preserves each recorded change and distinguishes removal from JSON null', () => {
  const removed: EntryEffectHistory = {
    ...effect,
    componentHistory: effect.componentHistory.map((change) => ({
      ...change,
      action: 'REMOVE',
      beforePayload: payload(9),
      payload: null,
    })),
  };
  assert.equal(
    exportComponentReportText(intl, report, [effect, removed]),
    'hp: 12 → 9\nhp: 9 → Absent',
  );
  const snapshot: ComponentReportEntity = {
    ...report,
    report: {
      type: 'Snapshot',
      items: [
        {
          target: { ...target, componentType: 'example/text' },
          displayName: 'Note',
          payload: { payloadType: 'JSON', schemaVersion: 1, data: null },
        },
        {
          target: { ...target, componentType: 'core/portrait' },
          displayName: 'Portrait',
          payload: { payloadType: 'ASSET', assetId: 'asset-id' },
        },
      ],
    },
  };
  assert.equal(
    exportComponentReportText(intl, snapshot, []),
    'Note (hp): null\nPortrait (hp): asset:asset-id',
  );
});

test('exports actual changes as text and preserves full history in JSON', async () => {
  const message: Message = {
    id: 'message',
    senderId: 'user',
    channelId: 'channel',
    name: 'Player',
    seed: [],
    text: '.st hp-3',
    entities: [{ type: 'ComponentReport', ...report }],
    created: effect.created,
    modified: effect.created,
    pos: 1,
    posP: 1,
    posQ: 1,
    color: '#000000',
    hasEntryEffects: true,
    inGame: true,
  };
  const result = exportMessage(intl, '', [])(message, [effect]);
  const saved = JSON.parse(await jsonBlob([result]).text()) as ExportMessage[];
  assert.deepEqual(saved[0]?.entryEffects, [effect]);
  const savedReport = saved[0]?.entities[0];
  assert.ok(savedReport?.type === 'ComponentReport');
  assert.deepEqual(savedReport.report, report.report);
  const text = await txtBlob(
    {
      intl,
      options: {
        format: 'txt',
        range: 'all',
        includeOutGame: true,
        includeArchived: true,
        simple: true,
        splitByLineBreak: false,
      },
    },
    [result],
  ).text();
  assert.match(text, /hp: 12 → 9/);
  assert.doesNotMatch(text, /\.st hp-3|min:|max:/);
});
