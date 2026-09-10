import assert from 'node:assert/strict';
import test from 'node:test';
import { parse } from '@boluo/interpreter';
import { prepareCounterPreview } from './prepare-preview';
import { prepareStateCommand } from './prepare-state-command';
import type { ComposeCountersState } from './types';

const prepare = (
  source: string,
  loadState: ComposeCountersState = { type: 'Ready', source, scopeId: 'scope', entries: [] },
  editing = false,
) => prepareCounterPreview(parse(source), { source, loadState, editing });

test('preview and sent reports share planned references, but only preview carries estimates', () => {
  const source = '.as @暁美ほむら; .st hp12mp10';
  const preview = prepare(source);
  const message = prepareStateCommand(parse(source), {
    mode: 'message',
    scopeId: 'scope',
    entries: [],
  });
  assert.equal(preview.type, 'Ready');
  assert.equal(message.type, 'Ready');
  assert.equal(preview.plans.length, 2);
  assert.deepEqual(message.plans, preview.plans);
  const previewEntity = preview.parsed.entities[0];
  const messageEntity = message.parsed.entities[0];
  assert.ok(
    previewEntity?.type === 'ComponentReport' && previewEntity.report.type === 'ChangePreview',
  );
  assert.deepEqual(
    previewEntity.report.items,
    preview.plans.map((plan) => plan.change),
  );
  assert.ok(messageEntity?.type === 'ComponentReport' && messageEntity.report.type === 'Change');
  assert.deepEqual(
    messageEntity.report.items,
    previewEntity.report.items.map((item) => item.component),
  );
  assert.equal(previewEntity.start, source.indexOf('.st'));
  assert.equal(previewEntity.len, source.length - previewEntity.start);
  assert.deepEqual(preview.parsed.asTarget, parse(source).asTarget);
});

test('errors expose plain diagnostics and never include mutation plans', () => {
  const source = '.st hp=1';
  const cases = [
    [prepare('.st hp=1.5'), { type: 'InvalidStateCommand' }],
    [prepare(source, { type: 'Unavailable', source }), { type: 'MissingCharacter' }],
    [prepare(source, { type: 'Error', source }), { type: 'LoadFailed' }],
    [
      prepare(source, { type: 'Ready', source, scopeId: 'scope', entries: [] }, true),
      { type: 'EditingCommand' },
    ],
    [prepare('.st hp=1 mp-2'), { type: 'UnknownCounter', counterName: 'mp' }],
  ] as const;
  for (const [result, error] of cases) {
    assert.equal(result.type, 'Error');
    assert.deepEqual(result.error, error);
    assert.equal('plans' in result, false);
    assert.equal(
      result.parsed.entities.some((entity) => entity.type === 'ComponentReport'),
      false,
    );
  }
});

test('loading and stale input keep the parser result until the corresponding data is ready', () => {
  const source = '.st hp=1';
  const parsed = parse(source);
  for (const loadState of [
    { type: 'Loading', source },
    { type: 'Ready', source: '.st mp=2', scopeId: 'scope', entries: [] },
  ] satisfies ComposeCountersState[]) {
    assert.deepEqual(prepare(source, loadState), { type: 'Pending', parsed });
  }
  assert.deepEqual(
    prepareCounterPreview(parsed, {
      source: '.st hp=2',
      editing: false,
      loadState: { type: 'Ready', source, scopeId: 'scope', entries: [] },
    }),
    { type: 'Pending', parsed },
  );
  const snapshot = prepare('.st');
  assert.equal(snapshot.type, 'Ready');
  assert.deepEqual(snapshot.plans, []);
  const text = 'hello';
  assert.deepEqual(prepare(text), { type: 'NotApplicable', parsed: parse(text) });
  assert.deepEqual(snapshot.parsed.entities, [
    { type: 'ComponentReport', start: 0, len: 3, report: { type: 'Snapshot', items: [] } },
  ]);
});
