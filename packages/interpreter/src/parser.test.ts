import assert from 'node:assert/strict';
import test from 'node:test';
import type { Entity } from '@boluo/api';
import { type Env, parse as originalParse, parseModifiers } from './parser';

const parse = (source: string, parseExpr = true, env?: Env) => {
  const { entities, text } = originalParse(source, parseExpr, env);
  assert.strictEqual(text, source);
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

test('parse modifier', () => {
  assert.strictEqual(originalParse('hello').broadcast, true);
  assert.strictEqual(originalParse('.mute').broadcast, false);
  assert.strictEqual(originalParse('.Mute').broadcast, false);
  assert.strictEqual(originalParse('.in ').inGame, true);
  assert.strictEqual(originalParse('.In ').inGame, true);
  assert.strictEqual(originalParse('.Ins').inGame, null);
  // assert.strictEqual(originalParse('.out').inGame, false);
  // assert.strictEqual(originalParse('.OUT').inGame, false);
});

test('parse temporary character name modifier', () => {
  const withAs = originalParse('.as Alice; hello world');
  assert.strictEqual(withAs.characterName, 'Alice');
  assert.strictEqual(withAs.inGame, true);
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

test('parse .as without name acts as in-game', () => {
  const parsed = originalParse('.as hello');
  assert.strictEqual(parsed.inGame, true);
  assert.strictEqual(parsed.characterName, '');
  const modifiers = parseModifiers('.as some text');
  assert.strictEqual(modifiers.characterName, '');
  assert.strictEqual(modifiers.inGame && modifiers.inGame.type, 'As');
  assert.strictEqual(modifiers.rest.trimStart(), 'some text');
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
