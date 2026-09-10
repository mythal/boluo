import { atom, type Atom } from 'jotai';
import { parseModifiers } from '@boluo/interpreter';
import { resolveSpeaker, type SpeakerIssue } from '../characters/resolveSpeaker';
import type { ComposeError, ComposeState } from './compose.reducer';
import type { CounterIssue } from '../counters/types';

export type ComposeIssue = ComposeError | CounterIssue | SpeakerIssue | { type: 'SENDING' };

type SpeakerOptions = Omit<
  Parameters<typeof resolveSpeaker>[0],
  'parsedInGame' | 'asTarget' | 'originalMessageAttribution'
>;

export const createComposeIssuesAtom = (
  {
    composeAtom,
    checkComposeAtom,
    counterIssueAtom,
    sendingAtom,
  }: {
    composeAtom: Atom<ComposeState>;
    checkComposeAtom: Atom<ComposeError | null>;
    counterIssueAtom: Atom<CounterIssue | null>;
    sendingAtom: Atom<boolean>;
  },
  speakerOptions: SpeakerOptions,
): Atom<ComposeIssue[]> =>
  atom((get) => {
    const compose = get(composeAtom);
    const modifiers = parseModifiers(compose.source);
    const { issue: speakerIssue } = resolveSpeaker({
      ...speakerOptions,
      parsedInGame: modifiers.inGame ? modifiers.inGame.inGame : null,
      asTarget: modifiers.asTarget,
      originalMessageAttribution: compose.originalMessageAttribution,
    });
    const composeError = get(checkComposeAtom);
    const counterIssue = get(counterIssueAtom);
    const issues: ComposeIssue[] = [];
    if (composeError) issues.push(composeError);
    if (speakerIssue) issues.push(speakerIssue);
    if (counterIssue) issues.push(counterIssue);
    if (get(sendingAtom)) issues.push({ type: 'SENDING' });
    return issues;
  });
