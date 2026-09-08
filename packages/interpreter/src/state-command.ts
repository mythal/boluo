import { createParserCombinators, type Parser } from './parser-combinator';

export type StateAssignment =
  { type: 'Set'; name: string; value: number } | { type: 'Adjust'; name: string; value: number };

export type StateCommand =
  | { type: 'Show'; name?: string }
  | { type: 'Update'; assignments: [StateAssignment, ...StateAssignment[]] }
  | { type: 'Remove'; name: string };

const { choice, many1, regex, spaces, end } = createParserCombinators<void>();

const prefix = spaces.with(regex(/^[.。]st/i, true));
// match $[hp:满], $[hp-3]
const quotedName = regex(/^\$\[([^\]\r\n]+)\]/u, true).then(([[, name], state]) => {
  const trimmed = name!.trim();
  return trimmed ? [trimmed, state] : null;
});
const unquotedName = regex(/^[\p{L}\p{N}\p{M}\p{So}.。_%?？、・—]+/u, true).map(([name]) => name);
const name = choice([quotedName, unquotedName]);
const unsignedNumber = regex(/^(?:\d+(?:\.\d+)?|\.\d+)/, true).map(([value]) => Number(value));
const number = regex(/^[+-]?/, true)
  .and(unsignedNumber)
  .map(([[sign], value]) => (sign === '-' ? -value : value));
const assignmentOperator = regex(/^[=:：]/, true);
const adjustmentOperator = regex(/^[+-]/, true).map(([sign]) => (sign === '-' ? -1 : 1));
const requiredSpaces = regex(/^\s+/, true);

const compactAssignmentName = regex(/^[\p{L}\p{M}_]+/u, true).map(([name]) => name);

// Explicit and spaced assignments need a separator before the next item.
// This prevents hp=1d6 from becoming two assignments: hp=1 and d=6.
const itemBoundary = regex(/^(?=\s|$)/);
const assignment = choice<StateAssignment>([
  // match hp:12, hp=-2, hp：12
  name
    .skip(spaces)
    .skip(assignmentOperator)
    .skip(spaces)
    .and(number)
    .skip(itemBoundary)
    .map(([name, value]) => ({ type: 'Set', name, value })),
  // match hp-3, hp + 2
  name
    .skip(spaces)
    .and(adjustmentOperator)
    .skip(spaces)
    .and(number)
    .skip(itemBoundary)
    .map(([[name, sign], value]) => ({ type: 'Adjust', name, value: sign * value })),
  // match hp 12
  name
    .skip(requiredSpaces)
    .and(number)
    .skip(itemBoundary)
    .map(([name, value]) => ({ type: 'Set', name, value })),
  // match 力量60
  // A sign belongs to an adjustment; do not reinterpret it as a compact assignment on backtracking.
  compactAssignmentName.and(unsignedNumber).map(([name, value]) => ({ type: 'Set', name, value })),
]);

const commands: Parser<StateCommand, void>[] = [
  // match .st, .st show
  regex(/^(?:show)?$/i, true).map(() => ({ type: 'Show' })),
  // match .st show hp, .st del hp
  regex(/^(show|del)/i, true)
    .skip(requiredSpaces)
    .and(name)
    .map(([[, subcommand], name]) => ({
      type: subcommand!.toLowerCase() === 'show' ? 'Show' : 'Remove',
      name,
    })),
  // match .sthp12, .st 力量60敏捷70, .st hp:12 mp-3
  many1(assignment.skip(spaces)).map((assignments) => ({ type: 'Update', assignments })),
  name.map((name) => ({ type: 'Show', name })), // match .st hp
];
const commandBody = choice(commands.map((command) => command.skip(end)));

export interface SourceRange {
  start: number;
  len: number;
}

export type ParsedStateCommand = {
  prefix: SourceRange;
  body: SourceRange;
} & (
  | { command: StateCommand; diagnostic?: never }
  | { command: null; diagnostic: { type: 'InvalidStateCommand' } }
);

// Called on the remainder after message modifiers. Ranges use original source offsets.
export const parseStateCommandSyntax = (
  source: string,
  offset: number,
): ParsedStateCommand | undefined => {
  const prefixResult = prefix.run({ text: '', rest: source }, undefined);
  if (!prefixResult) return undefined;
  const [[matched], state] = prefixResult;
  const rest = state.rest;
  const body = rest.trim();
  const ranges = {
    prefix: { start: offset + state.text.length - matched.length, len: matched.length },
    body: {
      start: offset + state.text.length + rest.length - rest.trimStart().length,
      len: body.length,
    },
  };
  const command = commandBody.run({ text: '', rest: body }, undefined)?.[0];
  // Without a space after .st, only recognize a complete update, not words like .status.
  if (rest !== '' && !/^\s/.test(rest) && command?.type !== 'Update') return undefined;
  // Check for safe integers here to prevent backtracking into a name query.
  // For example, .st hp2.5 is an invalid assignment, not a query for "hp2.5".
  if (
    !command ||
    (command.type === 'Update' &&
      command.assignments.some(({ value }) => !Number.isSafeInteger(value)))
  ) {
    return { ...ranges, command: null, diagnostic: { type: 'InvalidStateCommand' } };
  }
  return { ...ranges, command };
};
