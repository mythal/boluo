import type {
  ApplyEntryBatch,
  ComponentChangePreview,
  EntryBatchOperation,
  EntryComponent,
  EntryMetadata,
} from '@boluo/api';
import type { ParseResult, ParsedStateCommand } from '@boluo/interpreter';

export type CounterErrorReason =
  'UnknownCounter' | 'UnsupportedComponent' | 'InvalidName' | 'InvalidNumber';

export type CounterOperationError = { type: CounterErrorReason; counterName: string };

export type EntryMaybeCounter = EntryMetadata & { counter?: EntryComponent };

export interface CounterMutationPlan {
  operation: EntryBatchOperation;
  change: ComponentChangePreview;
}

export type ComposeCountersState = { source: string } & (
  | { type: 'Idle' }
  | { type: 'Loading' }
  | { type: 'Error' }
  | { type: 'Unavailable' }
  | { type: 'Ready'; scopeId: string; entries: EntryMaybeCounter[] }
);

export type StateCommandError =
  | NonNullable<ParsedStateCommand['diagnostic']>
  | { type: 'EditingCommand' | 'MissingCharacter' | 'LoadFailed' }
  | CounterOperationError;

export type StateCommandPreparation = { parsed: ParseResult } & (
  | { type: 'NotApplicable' }
  | { type: 'Ready'; plans: CounterMutationPlan[] }
  | { type: 'Error'; error: StateCommandError }
);

export type CounterPreviewPreparation =
  StateCommandPreparation | { type: 'Pending'; parsed: ParseResult };

export type PreparedCounterMessage =
  | { type: 'Ready'; parsed: ParseResult; batch: Omit<ApplyEntryBatch, 'messageId'> | null }
  | { type: 'Error'; error: StateCommandError };

export type CounterIssue = StateCommandError | { type: 'LoadingCounters' };

export type CounterCommitResult = 'Applied' | 'WriteFailed';
