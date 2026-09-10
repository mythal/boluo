import assert from 'node:assert/strict';
import test from 'node:test';
import { atom, createStore } from 'jotai';
import { createComposeIssuesAtom } from './compose-issues';
import { makeInitialComposeState, type ComposeError } from './compose.reducer';
import type { CounterIssue } from '../counters/types';

test('shared compose issues track draft, counter and sending state independently', () => {
  const store = createStore();
  const composeAtom = atom({ ...makeInitialComposeState(), source: '.as @missing; .st' });
  const checkComposeAtom = atom<ComposeError | null>(null);
  const counterIssueAtom = atom<CounterIssue | null>({ type: 'MissingCharacter' });
  const sendingAtom = atom(false);
  const issuesAtom = createComposeIssuesAtom(
    { composeAtom, checkComposeAtom, counterIssueAtom, sendingAtom },
    {
      nickname: 'Player',
      defaultInGame: true,
      channelCharacterId: null,
      channelCharacterName: '',
      resolveCharacter: () => ({ status: 'NotFound' }),
    },
  );
  assert.deepEqual(store.get(issuesAtom), [
    { type: 'CharacterReferenceUnavailable', identifier: 'missing', reason: 'NotFound' },
    { type: 'MissingCharacter' },
  ]);
  store.set(composeAtom, { ...store.get(composeAtom), source: '.st' });
  store.set(checkComposeAtom, { type: 'NO_NAME' });
  store.set(sendingAtom, true);
  assert.deepEqual(store.get(issuesAtom), [
    { type: 'NO_NAME' },
    { type: 'MissingCharacter' },
    { type: 'SENDING' },
  ]);
  store.set(composeAtom, { ...store.get(composeAtom), source: '.out hello' });
  store.set(checkComposeAtom, null);
  store.set(counterIssueAtom, null);
  store.set(sendingAtom, false);
  assert.deepEqual(store.get(issuesAtom), []);
});
