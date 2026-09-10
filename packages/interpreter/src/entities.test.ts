import assert from 'node:assert/strict';
import test from 'node:test';
import type { ComponentReport } from '@boluo/api';
import { toSimpleText } from './entities';

const component = { entryId: 'hp', scopeId: 'scope', key: 'hp', componentType: 'core/counter' };
const summary = (report: ComponentReport, source = '') =>
  toSimpleText(source, [{ type: 'ComponentReport', start: 0, len: source.length, report }]);

test('component reports have readable summaries without raw commands or invented changes', () => {
  assert.equal(
    summary(
      {
        type: 'Snapshot',
        items: [
          {
            component,
            displayName: '血量',
            payload: { payloadType: 'JSON', schemaVersion: 1, data: { value: 9, max: 20 } },
          },
        ],
      },
      '.st show',
    ),
    '血量: 9 / 20',
  );
  assert.equal(summary({ type: 'Change', items: [component] }, '.st hp-3'), 'Counter update: hp');
  assert.equal(summary({ type: 'Snapshot', items: [] }, '.st'), 'No components.');
});

test('component report summaries include every change and preview item in order', () => {
  const mp = { ...component, entryId: 'mp', key: 'mp' };
  assert.equal(summary({ type: 'Change', items: [component, mp] }), 'Counter update: hp, mp');
  assert.equal(
    summary({
      type: 'ChangePreview',
      items: [
        {
          component: { ...component, entryId: null },
          displayName: '血量',
          before: null,
          after: { payloadType: 'JSON', schemaVersion: 1, data: { value: 9 } },
        },
        {
          component: mp,
          displayName: '',
          before: { payloadType: 'JSON', schemaVersion: 1, data: { value: 5 } },
          after: null,
        },
      ],
    }),
    'Preview: 血量: 9\nPreview: mp: deleted',
  );
});

test('unknown components and counter versions have an explicit text fallback', () => {
  for (const [componentType, schemaVersion] of [
    ['example/text', 1],
    ['core/counter', 2],
  ] as const) {
    assert.equal(
      summary({
        type: 'Snapshot',
        items: [
          {
            component: { ...component, entryId: 'entry', key: 'note', componentType },
            displayName: 'Note',
            payload: { payloadType: 'JSON', schemaVersion, data: { text: 'Hello', value: 9 } },
          },
        ],
      }),
      'Note: Unsupported component',
    );
  }
});
