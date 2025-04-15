import type { Entity } from '@boluo/api';
import { type Env, parse as originalParse } from './parser';

const parse = (source: string, parseExpr = true, env?: Env) => {
  const { entities, text } = originalParse(source, parseExpr, env);
  expect(text).toEqual(source);
  return entities.filter((entity) => entity.type !== 'Text');
};

test('parse emphasis', () => {
  expect(parse('hello *world*!')).toEqual<Entity[]>([
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
  ]);
});

test('parse link', () => {
  expect(parse('hello [world](https://masiro.me/)!')).toEqual<Entity[]>([
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
  ]);
});

test('parse string', () => {
  expect(parse('hello **世界**！！！！')).toEqual<Entity[]>([
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
  ]);
});

test('parse auto link', () => {
  expect(parse('hello https://www.lightnovel.app/home')).toEqual<Entity[]>([
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
  ]);
});

test('parse code', () => {
  expect(parse('hello `Uw U` world')).toEqual<Entity[]>([
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
  ]);

  expect(parse('hello `Uw\n U` world')).toEqual<Entity[]>([]);
});

test('parse code block', () => {
  expect(parse('hello ```Uw U``` world')).toEqual<Entity[]>([
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
  ]);
});

test('parse modifier', () => {
  expect(originalParse('hello').broadcast).toBe(true);
  expect(originalParse('.mute').broadcast).toBe(false);
  expect(originalParse('.Mute').broadcast).toBe(false);
  expect(originalParse('.in ').inGame).toBe(true);
  expect(originalParse('.In ').inGame).toBe(true);
  expect(originalParse('.Ins').inGame).toBe(null);
  // expect(originalParse('.out').inGame).toBe(false);
  // expect(originalParse('.OUT').inGame).toBe(false);
});

test('parse roll', () => {
  expect(parse('1d20')).toEqual<Entity[]>([]);
  expect(parse('{1d20}')).toEqual<Entity[]>([
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
  ]);

  expect(parse('/r {1d20}')).toEqual<Entity[]>([
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
  ]);
});
