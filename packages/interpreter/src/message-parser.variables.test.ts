import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluate, makeRng } from './eval';
import { parseMessageContent, type MessageParseEnv } from './message-parser';
import { normalizeVariableLookupKey } from './variables';

const env: MessageParseEnv = {
  defaultDiceFace: 20,
  variables: {
    [normalizeVariableLookupKey('hp')]: 12,
    [normalizeVariableLookupKey('力量')]: 3,
    [normalizeVariableLookupKey('侦查')]: 60,
    [normalizeVariableLookupKey('hp:满')]: 20,
    [normalizeVariableLookupKey('d20')]: -2,
  },
};
const parseContent = (source: string, mode: 'message' | 'roll' | 'check', environment = env) => {
  const result = parseMessageContent({ text: '', rest: source }, mode, environment);
  assert.ok(result);
  const [entities, state] = result;
  assert.equal(state.text, source);
  assert.equal(state.rest, '');
  return entities;
};
const expr = (source: string, environment = env) => {
  const entity = parseContent(source, 'roll', environment).find((entity) => entity.type === 'Expr');
  assert.ok(entity);
  return entity.node;
};

test('a variable roll captures its value and keeps the same dice stream as a literal', () => {
  const key = normalizeVariableLookupKey('力量');
  const variables = { [key]: 3 };
  const node = expr('d20+力量', { ...env, variables });
  variables[key] = 100;
  const result = evaluate(node, makeRng([1, 2, 3, 4]));
  assert.equal(result.value, evaluate(expr('d20+3'), makeRng([1, 2, 3, 4])).value);
  assert.ok(result.type === 'Binary');
  assert.deepEqual(result.r, { type: 'Variable', name: '力量', value: 3 });
});

test('inline references preserve source spans and support case and quoted identifiers', () => {
  const source = '生命 {HP}，满值 {$[hp:满]}';
  const entities = parseContent(source, 'message');
  assert.deepEqual(
    entities
      .filter((entity) => entity.type === 'Expr')
      .map((entity) => source.slice(entity.start, entity.start + entity.len)),
    ['{HP}', '{$[hp:满]}'],
  );
  assert.deepEqual(expr('$[d20]'), { type: 'Variable', name: 'd20', value: -2 });
});

test('unresolved variables fall back to text while preserving parsed rolls', () => {
  const environments: MessageParseEnv['variables'][] = [
    {},
    { [normalizeVariableLookupKey('missing')]: Number.NaN },
    { [normalizeVariableLookupKey('missing')]: Infinity },
  ];
  for (const variables of environments) {
    assert.deepEqual(parseContent('d20+missing', 'roll', { ...env, variables }), [
      { type: 'Expr', start: 0, len: 3, node: { type: 'Roll', counter: 1, face: 20 } },
      { type: 'Text', start: 3, len: 8 },
    ]);
  }
  for (const source of ['missing', '$[missing]', '$[toString]']) {
    assert.ok(
      parseContent(source, 'roll').every((entity) => entity.type === 'Text'),
      source,
    );
  }
  assert.deepEqual(expr('coc missing'), { type: 'CocRoll', subType: 'NORMAL' });
  const entities = parseContent('生命 {missing}，投骰 {d20}', 'message');
  const expressions = entities.filter((entity) => entity.type === 'Expr');
  assert.deepEqual(
    expressions.map((entity) => entity.node),
    [{ type: 'Roll', counter: 1, face: 20 }],
  );
});

test('CoC targets accept variable snapshots including zero', () => {
  for (const value of [60, 0]) {
    const node = expr('coc 侦查', {
      ...env,
      variables: { [normalizeVariableLookupKey('侦查')]: value },
    });
    assert.ok(node.type === 'CocRoll');
    assert.deepEqual(node.target, { type: 'Variable', name: '侦查', value });
    const result = evaluate(node, makeRng([1, 2, 3, 4]));
    assert.ok(result.type === 'CocRoll');
    assert.equal(result.targetValue, value);
  }
});

test('check targets support arithmetic and preserve unparsed reasons', () => {
  const source = '侦查+10 searching';
  const entities = parseContent(source, 'check');
  const [check, reason] = entities;
  assert.equal(entities.length, 2);
  assert.ok(check?.type === 'Expr');
  const result = evaluate(check.node, makeRng([1, 2, 3, 4]));
  assert.ok(result.type === 'CocRoll');
  assert.equal(result.targetValue, 70);
  assert.ok(reason?.type === 'Text');
  assert.equal(source.slice(reason.start, reason.start + reason.len), ' searching');
  assert.deepEqual(parseContent('0', 'check'), [
    {
      type: 'Expr',
      start: 0,
      len: 1,
      node: { type: 'CocRoll', subType: 'NORMAL', target: { type: 'Num', value: 0 } },
    },
  ]);
  for (const suffix of ['+missing', '+', '+*2']) {
    const source = `侦查${suffix}`;
    const [entity, remainder] = parseContent(source, 'check');
    assert.ok(entity?.type === 'Expr');
    assert.deepEqual(entity.node, expr('coc 侦查'));
    assert.ok(remainder?.type === 'Text');
    assert.equal(source.slice(remainder.start, remainder.start + remainder.len), suffix);
  }
  for (const source of ['', 'missing', '$[missing]']) {
    assert.ok(
      parseContent(source, 'check').every((entity) => entity.type === 'Text'),
      source,
    );
  }
});
