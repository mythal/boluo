import assert from 'node:assert/strict';
import test from 'node:test';
import { parseStateCommandSyntax } from './state-command';

const parsedCommand = (source: string) => parseStateCommandSyntax(source, 0)?.command ?? null;
const parsedAssignments = (source: string) => {
  const command = parsedCommand(source);
  assert.ok(command?.type === 'Update', source);
  return command.assignments;
};

test('state commands accept common QQ spellings', () => {
  for (const source of [
    '.st hp:12',
    '.st hp=12',
    '.st hp 12',
    '.st hp12',
    '.sthp12',
    '。SThp:12',
    '。ST hp：12',
  ]) {
    assert.deepEqual(parsedAssignments(source), [{ type: 'Set', name: 'hp', value: 12 }], source);
  }
  assert.deepEqual(parsedAssignments('.st hp-3'), [{ type: 'Adjust', name: 'hp', value: -3 }]);
  assert.deepEqual(parsedAssignments('.st hp -3'), [{ type: 'Adjust', name: 'hp', value: -3 }]);
  assert.deepEqual(parsedAssignments('.st hp - 3'), [{ type: 'Adjust', name: 'hp', value: -3 }]);
  assert.deepEqual(parsedAssignments('.st hp + 2'), [{ type: 'Adjust', name: 'hp', value: 2 }]);
  assert.deepEqual(parsedAssignments('.st hp=-2'), [{ type: 'Set', name: 'hp', value: -2 }]);
  assert.deepEqual(parsedAssignments('.st $[hp:满]=20'), [
    { type: 'Set', name: 'hp:满', value: 20 },
  ]);
  assert.deepEqual(parsedCommand('.st show hp'), { type: 'Show', name: 'hp' });
  assert.deepEqual(parsedCommand('.st'), { type: 'Show' });
  assert.deepEqual(parsedCommand('.st del hp'), { type: 'Remove', name: 'hp' });
  assert.equal(parsedCommand('We should use .st hp:12'), null);
});

test('state command separators are unambiguous and explicit names preserve punctuation', () => {
  for (const name of ['hp:满', 'hp-3']) {
    assert.deepEqual(parsedAssignments(`.st $[${name}]=20`), [{ type: 'Set', name, value: 20 }]);
    assert.deepEqual(parsedAssignments(`.st $[${name}]-2`), [{ type: 'Adjust', name, value: -2 }]);
    assert.deepEqual(parsedCommand(`.st show $[${name}]`), { type: 'Show', name });
  }
  assert.deepEqual(parsedAssignments('.st hp2=12'), [{ type: 'Set', name: 'hp2', value: 12 }]);
  assert.deepEqual(parsedCommand('.st hp2foo'), { type: 'Show', name: 'hp2foo' });
  assert.deepEqual(parsedAssignments('.st $[ HP:满 ]=0'), [
    { type: 'Set', name: 'HP:满', value: 0 },
  ]);
  for (const source of ['.st hp:', '.st hp:满=20', '.st hp-3-2', '.st $[ ]=2']) {
    assert.equal(
      parseStateCommandSyntax(source, 0)?.diagnostic?.type,
      'InvalidStateCommand',
      source,
    );
  }
});

test('state commands collect every assignment in source order', () => {
  for (const source of [
    '.st 力量60敏捷70',
    '.st力量60敏捷70',
    '.st 力量60 敏捷70',
    '.st 力量:60 敏捷=70',
  ]) {
    assert.deepEqual(
      parsedCommand(source),
      {
        type: 'Update',
        assignments: [
          { type: 'Set', name: '力量', value: 60 },
          { type: 'Set', name: '敏捷', value: 70 },
        ],
      },
      source,
    );
  }
  assert.deepEqual(parsedAssignments('.st hp:12 hp-3 $[hp2]=5'), [
    { type: 'Set', name: 'hp', value: 12 },
    { type: 'Adjust', name: 'hp', value: -3 },
    { type: 'Set', name: 'hp2', value: 5 },
  ]);
  for (const source of [
    '.st hp:12 mp:',
    '.st hp:12 mp=2.5',
    '.st hp:12 mp=9007199254740992',
    '.st hp=1d6',
    '.st hp:12 trailing',
    '.st hp:12 $[mp',
  ]) {
    const parsed = parseStateCommandSyntax(source, 0);
    assert.deepEqual(parsed?.diagnostic, { type: 'InvalidStateCommand' }, source);
    assert.equal(parsed?.command, null, source);
  }
});

test('adjacent adjustments cannot fall back to compact assignments', () => {
  for (const sign of ['-', '+']) {
    const direction = sign === '-' ? -1 : 1;
    assert.deepEqual(parsedAssignments(`.st hp${sign}3 mp${sign}2`), [
      { type: 'Adjust', name: 'hp', value: direction * 3 },
      { type: 'Adjust', name: 'mp', value: direction * 2 },
    ]);
    const parsed = parseStateCommandSyntax(`.st hp${sign}3mp${sign}2`, 0);
    assert.equal(parsed?.command, null);
    assert.deepEqual(parsed?.diagnostic, { type: 'InvalidStateCommand' });
  }
});

test('state commands reject fractional and unsafe integer writes', () => {
  for (const source of [
    '.st hp=2.5',
    '.st hp+2.5',
    '.st hp2.5',
    '.st hp 2.5',
    '.st hp=9007199254740992',
    '.st hp=-9007199254740992',
  ]) {
    assert.equal(
      parseStateCommandSyntax(source, 0)?.diagnostic?.type,
      'InvalidStateCommand',
      source,
    );
  }
  for (const value of [0, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]) {
    assert.deepEqual(parsedAssignments(`.st hp=${value}`), [{ type: 'Set', name: 'hp', value }]);
  }
});

test('source ranges include the supplied offset and exclude surrounding whitespace', () => {
  const earlierText = '🐉 earlier text ';
  const source = ' \t。ST $[HP:满]=0\n力量60  ';
  const parsed = parseStateCommandSyntax(source, earlierText.length);
  assert.ok(parsed?.command?.type === 'Update');
  assert.equal(parsed.command.assignments.length, 2);
  assert.deepEqual(parsed.prefix, { start: earlierText.length + 2, len: 3 });
  assert.deepEqual(parsed.body, {
    start: earlierText.length + 6,
    len: '$[HP:满]=0\n力量60'.length,
  });
  const original = earlierText + source;
  assert.equal(
    original.slice(parsed.body.start, parsed.body.start + parsed.body.len),
    '$[HP:满]=0\n力量60',
  );

  assert.deepEqual(parseStateCommandSyntax('.st  ', 7), {
    prefix: { start: 7, len: 3 },
    body: { start: 12, len: 0 },
    command: { type: 'Show' },
  });
});

test('omitting the prefix space only recognizes updates, not similar words', () => {
  for (const source of ['.status', '.sthp', 'hello .sthp12']) {
    assert.equal(parseStateCommandSyntax(source, 0), undefined, source);
  }
  assert.deepEqual(parsedCommand('.st showman'), { type: 'Show', name: 'showman' });
});
