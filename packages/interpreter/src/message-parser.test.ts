import assert from 'node:assert/strict';
import test from 'node:test';
import type { Entity } from '@boluo/api';
import { parseMessageContent, parseModifiers } from './message-parser';

const parse = (source: string) => {
  const result = parseMessageContent({ text: '', rest: source }, 'message');
  assert.ok(result);
  const [entities, state] = result;
  assert.equal(state.text, source);
  assert.equal(state.rest, '');
  return entities.filter((entity) => entity.type !== 'Text');
};

test('parse emphasis', () => {
  const expected: Entity[] = [
    {
      start: 6,
      len: 7,
      type: 'Emphasis',
      child: {
        type: 'Text',
        start: 7,
        len: 5,
      },
    },
  ];

  assert.deepStrictEqual(parse('hello *world*!'), expected);
});

test('arithmetic keeps left associativity and multiplication precedence', () => {
  const [entity] = parse('{20-6-2*3}');
  assert.ok(entity?.type === 'Expr');
  assert.deepEqual(entity.node, {
    type: 'Binary',
    op: '-',
    l: {
      type: 'Binary',
      op: '-',
      l: { type: 'Num', value: 20 },
      r: { type: 'Num', value: 6 },
    },
    r: {
      type: 'Binary',
      op: '×',
      l: { type: 'Num', value: 2 },
      r: { type: 'Num', value: 3 },
    },
  });
});

test('parse link', () => {
  const expected: Entity[] = [
    {
      start: 6,
      len: 27,
      type: 'Link',
      href: {
        start: 14,
        len: 18,
      },
      child: {
        type: 'Text',
        start: 7,
        len: 5,
      },
    },
  ];

  assert.deepStrictEqual(parse('hello [world](https://masiro.me/)!'), expected);
});

test('parse string', () => {
  const expected: Entity[] = [
    {
      start: 6,
      len: 6,
      type: 'Strong',
      child: {
        type: 'Text',
        start: 8,
        len: 2,
      },
    },
  ];

  assert.deepStrictEqual(parse('hello **世界**！！！！'), expected);
});

test('parse strong emphasis', () => {
  const expected: Entity[] = [
    {
      start: 6,
      len: 11,
      type: 'StrongEmphasis',
      child: {
        type: 'Text',
        start: 9,
        len: 5,
      },
    },
  ];

  assert.deepStrictEqual(parse('hello ***world***!'), expected);
});

test('parse auto link', () => {
  const expected: Entity[] = [
    {
      start: 6,
      len: 31,
      type: 'Link',
      href: {
        start: 6,
        len: 31,
      },
      child: {
        type: 'Text',
        start: 6,
        len: 31,
      },
    },
  ];

  assert.deepStrictEqual(parse('hello https://www.lightnovel.app/home'), expected);
});

test('parse code', () => {
  const inlineCode: Entity[] = [
    {
      start: 6,
      len: 6,
      type: 'Code',
      child: {
        type: 'Text',
        start: 7,
        len: 4,
      },
    },
  ];

  assert.deepStrictEqual(parse('hello `Uw U` world'), inlineCode);
  assert.deepStrictEqual(parse('hello `Uw\n U` world'), []);
});

test('parse code block', () => {
  const expected: Entity[] = [
    {
      start: 6,
      len: 11,
      type: 'CodeBlock',
      child: {
        type: 'Text',
        start: 9,
        len: 4,
      },
    },
  ];

  assert.deepStrictEqual(parse('hello ```Uw U``` world'), expected);
});

test('modifiers accept case variants and preserve word boundaries', () => {
  for (const source of ['.mute', '.Mute']) {
    assert.ok(parseModifiers(source).mute);
  }
  for (const source of ['.in ', '.In ']) {
    const { inGame } = parseModifiers(source);
    assert.ok(inGame && inGame.inGame);
  }
  assert.equal(parseModifiers('.Ins').inGame, false);
});

test('roll and check modifier spellings leave the complete target as content', () => {
  for (const [source, rest, isCheck] of [
    ['.ra 侦查', '侦查', true],
    ['。RA 侦查', '侦查', true],
    ['.as @hero; .ra 侦查', '侦查', true],
    ['.ra侦查', '侦查', true],
    ['.ra60', '60', true],
    ['.rahp', 'hp', true],
    ['.r1d20+hp', '1d20+hp', false],
  ] as const) {
    const parsed = parseModifiers(source);
    assert.equal(parsed.isRoll, true, source);
    assert.equal(parsed.isCheck, isCheck, source);
    assert.equal(parsed.rest, rest, source);
    assert.equal(parsed.text + parsed.rest, source);
  }
});

test('parse temporary character name modifier', () => {
  const withAs = parseModifiers('.as Alice; hello world');
  assert.strictEqual(withAs.characterName, 'Alice');
  assert.deepStrictEqual(withAs.asTarget, { type: 'TemporaryName', name: 'Alice' });
  assert.strictEqual(withAs.inGame && withAs.inGame.inGame, true);
  assert.ok(withAs.modifiers.some((modifier) => modifier.type === 'As'));

  const modifiers = parseModifiers('.as   Bob the Brave;  hi');
  assert.strictEqual(modifiers.characterName, 'Bob the Brave');
  assert.strictEqual(modifiers.rest.trimStart(), 'hi');

  const chinesePunctuation = parseModifiers('.as 贝伦卡斯泰露； 泥嘻嘻');
  assert.strictEqual(chinesePunctuation.characterName, '贝伦卡斯泰露');
  assert.strictEqual(chinesePunctuation.rest.trimStart(), '泥嘻嘻');

  const withSpaces = parseModifiers('.as  Alice  Bob  ; greetings');
  assert.strictEqual(withSpaces.characterName, 'Alice  Bob');
  assert.strictEqual(withSpaces.rest.trimStart(), 'greetings');

  const newlineDelimiter = parseModifiers('.as 勇者\n战斗!');
  assert.strictEqual(newlineDelimiter.characterName, '勇者');
  assert.strictEqual(newlineDelimiter.rest.trimStart(), '战斗!');

  const newlineDelimiterAndWhitespace = parseModifiers('.as 魔女工艺掌门 玻璃匠薇儿   \n逃跑!');
  assert.strictEqual(newlineDelimiterAndWhitespace.characterName, '魔女工艺掌门 玻璃匠薇儿');
  assert.strictEqual(newlineDelimiterAndWhitespace.rest.trimStart(), '逃跑!');

  const delimiterAndNewline = parseModifiers('.as 魔女工艺掌门 玻璃匠薇儿;   \n逃跑!');
  assert.strictEqual(delimiterAndNewline.characterName, '魔女工艺掌门 玻璃匠薇儿');
  assert.strictEqual(delimiterAndNewline.rest.trimStart(), '逃跑!');

  const delimiterAndNewlineAndRest = parseModifiers('.as 魔女工艺掌门 玻璃匠薇儿;Magic\n逃跑!');
  assert.strictEqual(delimiterAndNewlineAndRest.characterName, '魔女工艺掌门 玻璃匠薇儿');
  assert.strictEqual(delimiterAndNewlineAndRest.rest.trimStart(), 'Magic\n逃跑!');
});

test('parse character reference in .as modifier', () => {
  const parsed = parseModifiers('.as @alice; hello world');
  assert.strictEqual(parsed.characterName, '');
  assert.deepStrictEqual(parsed.asTarget, {
    type: 'CharacterReference',
    identifier: 'alice',
  });
  assert.strictEqual(parsed.inGame && parsed.inGame.inGame, true);

  const identifier = `@${'a'.repeat(64)}`;
  assert.deepStrictEqual(parseModifiers(`.as ${identifier}; hello`).asTarget, {
    type: 'CharacterReference',
    identifier: 'a'.repeat(64),
  });
});

test('parse default character reference in .as modifier', () => {
  const parsed = parseModifiers('.as @; hello world');
  assert.deepStrictEqual(parsed.asTarget, { type: 'DefaultCharacter' });
  assert.strictEqual(parsed.inGame && parsed.inGame.inGame, true);
  assert.strictEqual(parseModifiers('.as @; hello world').rest.trimStart(), 'hello world');
});

test('parse .as without name acts as in-game', () => {
  const parsed = parseModifiers('.as hello');
  assert.strictEqual(parsed.inGame && parsed.inGame.inGame, true);
  assert.strictEqual(parsed.characterName, '');
  const modifiers = parseModifiers('.as some text');
  assert.strictEqual(modifiers.characterName, '');
  assert.strictEqual(modifiers.inGame && modifiers.inGame.type, 'As');
  assert.strictEqual(modifiers.rest.trimStart(), 'some text');

  const newlineBody = parseModifiers('.as\n写一些话\n换行继续写');
  assert.strictEqual(newlineBody.characterName, '');
  assert.strictEqual(newlineBody.inGame && newlineBody.inGame.type, 'As');
  assert.strictEqual(newlineBody.rest, '写一些话\n换行继续写');

  const spacedNewlineBody = parseModifiers('.as   \n写一些话');
  assert.strictEqual(spacedNewlineBody.characterName, '');
  assert.strictEqual(spacedNewlineBody.rest, '写一些话');
});

test('an overlong .as name is treated as message text', () => {
  const longText = 'a'.repeat(33);
  const modifiers = parseModifiers(`.as ${longText}\n换行继续写`);
  assert.strictEqual(modifiers.characterName, '');
  assert.strictEqual(modifiers.inGame && modifiers.inGame.type, 'As');
  assert.strictEqual(modifiers.rest, `${longText}\n换行继续写`);

  const delimited = parseModifiers(`.as ${longText}; 正文`);
  assert.strictEqual(delimited.characterName, '');
  assert.strictEqual(delimited.rest, `${longText}; 正文`);
});

test('parse roll', () => {
  assert.deepStrictEqual(parse('1d20'), []);

  const singleRoll: Entity[] = [
    {
      type: 'Expr',
      start: 0,
      len: 6,
      node: {
        counter: 1,
        face: 20,
        type: 'Roll',
      },
    },
  ];

  assert.deepStrictEqual(parse('{1d20}'), singleRoll);

  const prefixedRoll: Entity[] = [
    {
      type: 'Expr',
      start: 3,
      len: 6,
      node: {
        counter: 1,
        face: 20,
        type: 'Roll',
      },
    },
  ];

  assert.deepStrictEqual(parse('/r {1d20}'), prefixedRoll);
});
