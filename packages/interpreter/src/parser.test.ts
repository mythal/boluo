import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, needsVariableEnvironment } from './parser';
import { normalizeVariableLookupKey } from './variables';

test('message modifiers are reflected in the combined parse result', () => {
  const plain = parse('hello');
  assert.equal(plain.broadcast, true);
  assert.equal(plain.inGame, null);
  assert.equal(plain.isAction, false);

  const parsed = parse('.me .mute .in hello');
  assert.equal(parsed.broadcast, false);
  assert.equal(parsed.inGame, true);
  assert.equal(parsed.isAction, true);
  assert.equal(parsed.text, '.me .mute .in hello');
});

test('roll and check modifiers select the appropriate message grammar', () => {
  const env = {
    defaultDiceFace: 6,
    variables: { [normalizeVariableLookupKey('hp')]: 12 },
  };
  const roll = parse('.r d', env);
  assert.equal(roll.isRoll, true);
  assert.deepEqual(roll.entities, [
    { type: 'Expr', start: 3, len: 1, node: { type: 'Roll', counter: 1, face: 6 } },
  ]);
  const check = parse('.ra hp', env);
  assert.equal(check.isRoll, true);
  assert.deepEqual(check.entities, [
    {
      type: 'Expr',
      start: 4,
      len: 2,
      node: {
        type: 'CocRoll',
        subType: 'NORMAL',
        target: { type: 'Variable', name: 'hp', value: 12 },
      },
    },
  ]);
});

test('variable environment detection uses the grammar without requiring values', () => {
  for (const source of [
    'hello',
    '.r d20+2',
    '.ra 60',
    '`{hp}`',
    'https://example.com/hp',
    '.st hp=',
    '{hp+}',
  ])
    assert.equal(needsVariableEnvironment(source), false, source);
  for (const source of [
    '.r d20+hp',
    '.ra 侦查',
    '{hp}',
    '.r $[hp:满]',
    '.st hp:12',
    '.st show',
    '.r 2#(d20+hp)',
    '.r coc hp',
    '{hp+} then {mp}',
  ])
    assert.equal(needsVariableEnvironment(source), true, source);
  assert.ok(parse('{hp}').entities.every((entity) => entity.type === 'Text'));
});

test('state commands integrate with message modifiers and retain original source ranges', () => {
  const source = '.as @英雄; 。ST力量60敏捷70';
  const parsed = parse(source);
  assert.equal(parsed.text, source);
  assert.deepEqual(parsed.asTarget, { type: 'CharacterReference', identifier: '英雄' });
  const syntax = parsed.stateCommand;
  assert.ok(syntax);
  assert.deepEqual(syntax.command, {
    type: 'Update',
    assignments: [
      { type: 'Set', name: '力量', value: 60 },
      { type: 'Set', name: '敏捷', value: 70 },
    ],
  });
  assert.equal(source.slice(syntax.prefix.start, syntax.prefix.start + syntax.prefix.len), '。ST');
  assert.equal(
    source.slice(syntax.body.start, syntax.body.start + syntax.body.len),
    '力量60敏捷70',
  );
  assert.deepEqual(structuredClone(parsed), parsed);

  const invalid = parse('.me .st hp=');
  assert.equal(invalid.isAction, true);
  assert.equal(invalid.stateCommand?.command, null);
  assert.deepEqual(invalid.stateCommand?.diagnostic, { type: 'InvalidStateCommand' });
  assert.deepEqual(structuredClone(invalid), invalid);

  for (const source of ['hello .st hp:12', '`.st hp:12`', '.status']) {
    assert.equal(parse(source).stateCommand, undefined);
  }
});
