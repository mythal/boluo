import { isApiError } from '@boluo/api/errors';
import { explainError } from '@boluo/locale/errors';

interface ErrorIntl {
  formatMessage(descriptor: { defaultMessage: string }): string;
}

export class CharacterIdentifierConflictError extends Error {
  override name = 'CharacterIdentifierConflictError';

  constructor() {
    super('This character identifier is already in use.');
  }
}

export class CharacterStaleError extends Error {
  override name = 'CharacterStaleError';
}

export const toCharacterMutationError = (intl: ErrorIntl, cause: unknown): Error => {
  if (isApiError(cause)) {
    if (cause.code === 'CONFLICT') {
      if (cause.context === 'character_identifiers') {
        return new CharacterIdentifierConflictError();
      }
      if (
        cause.context === 'Character version is stale' ||
        cause.context === 'Character Scope version is stale'
      ) {
        return new CharacterStaleError(
          intl.formatMessage({
            defaultMessage:
              'This character was updated elsewhere. Close and reopen the editor to load the latest version.',
          }),
        );
      }
    }
  }
  if (cause instanceof Error) return cause;
  return new Error(explainError(intl, cause));
};
