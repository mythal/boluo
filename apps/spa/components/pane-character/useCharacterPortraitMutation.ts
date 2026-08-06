import { isApiError, type Asset, type EntryComponentMatch } from '@boluo/api';
import { patch, post, put } from '@boluo/api-browser';
import { explainError } from '@boluo/locale/errors';
import { unwrap } from '@boluo/utils/result';
import { useCallback, useMemo, useState } from 'react';
import { type IntlShape, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import { mediaMaxSizeMb, upload, type UploadError } from '../../media';
import { isValidEntryDisplayName, isValidEntryKey } from './entry-metadata';
import {
  makePortraitAssetName,
  makePortraitDisplayName,
  makePortraitEntryKey,
  parsePortraitComponent,
  PORTRAIT_COMPONENT_TYPE,
  reorderPortraitEntries,
  sortPortraitEntries,
} from './portrait';

type PortraitMutationOperation =
  | { type: 'UPLOAD'; entryId: string | null }
  | { type: 'REMOVE'; entryId: string }
  | { type: 'MOVE'; entryId: string }
  | { type: 'EDIT_METADATA'; entryId: string };

interface Options {
  spaceId: string;
  scopeId: string;
  characterName: string;
  portraitEntries: EntryComponentMatch[];
}

const uploadErrorMessage = (intl: IntlShape, error: UploadError): string => {
  if ('code' in error) return explainError(intl, error);
  switch (error.type) {
    case 'MEDIA_VALIDATION_ERROR':
      if (error.err === 'MEDIA_TOO_LARGE') {
        return intl.formatMessage(
          { defaultMessage: 'File size must be less than {sizeLimit}M.' },
          { sizeLimit: mediaMaxSizeMb },
        );
      }
      return intl.formatMessage({ defaultMessage: 'Unsupported media type.' });
    case 'TIMEOUT':
      return intl.formatMessage({ defaultMessage: 'The image upload timed out.' });
    case 'PRESIGN_FAIL':
      return explainError(intl, error.err);
    case 'S3_ERROR':
      return intl.formatMessage({ defaultMessage: 'The image could not be uploaded.' });
  }
};

const operationErrorMessage = (intl: IntlShape, cause: unknown): string => {
  if (isApiError(cause)) return explainError(intl, cause);
  if (typeof cause === 'object' && cause != null && 'type' in cause) {
    const type = cause.type;
    if (
      type === 'MEDIA_VALIDATION_ERROR' ||
      type === 'TIMEOUT' ||
      type === 'PRESIGN_FAIL' ||
      type === 'S3_ERROR'
    ) {
      return uploadErrorMessage(intl, cause as UploadError);
    }
  }
  return explainError(intl, cause);
};

export const useCharacterPortraitMutation = ({
  spaceId,
  scopeId,
  characterName,
  portraitEntries,
}: Options) => {
  const intl = useIntl();
  const { mutate } = useSWRConfig();
  const [operation, setOperation] = useState<PortraitMutationOperation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const portraitQueryKey = useMemo(
    () => ['/entries/by_component', spaceId, scopeId, PORTRAIT_COMPONENT_TYPE] as const,
    [scopeId, spaceId],
  );

  const revalidatePortraitEntries = useCallback(async () => {
    await Promise.all([mutate(portraitQueryKey), mutate(['/entries/by_scope', spaceId, scopeId])]);
  }, [mutate, portraitQueryKey, scopeId, spaceId]);

  const attachPortraitAsset = useCallback(
    async (asset: Asset, entry: EntryComponentMatch | undefined) => {
      const portraitData = parsePortraitComponent(entry?.component);
      if (entry != null && portraitData != null) {
        await patch('/entries/components', null, {
          spaceId,
          scopeId,
          entryId: entry.id,
          messageId: null,
          changes: [
            {
              action: 'SET',
              componentType: PORTRAIT_COMPONENT_TYPE,
              expectedVersion: portraitData.version,
              payloadType: 'ASSET',
              assetId: asset.id,
            },
          ],
        }).then(unwrap);
        return;
      }

      await post('/entries/create', null, {
        spaceId,
        scopeId,
        key: makePortraitEntryKey(),
        aliases: [],
        displayName: makePortraitDisplayName(characterName),
        referenceNoteId: null,
        components: {
          [PORTRAIT_COMPONENT_TYPE]: { payloadType: 'ASSET', assetId: asset.id },
        },
        tags: [],
        beforeEntryId: null,
        messageId: null,
      }).then(unwrap);
    },
    [characterName, scopeId, spaceId],
  );

  const uploadPortrait = useCallback(
    async (file: File, entry?: EntryComponentMatch) => {
      setOperation({ type: 'UPLOAD', entryId: entry?.id ?? null });
      setError(null);
      let asset: Asset | null = null;
      let assetAttached = false;
      try {
        const { mediaId } = (await upload(file)).unwrap();
        const createdAsset = await post('/assets/create', null, {
          spaceId,
          mediaId,
          name: makePortraitAssetName(file.name, characterName),
          policy: 'UNLISTED',
        }).then(unwrap);
        asset = createdAsset;
        await attachPortraitAsset(createdAsset, entry);
        assetAttached = true;
        await Promise.all([
          mutate(['/assets/query', spaceId, createdAsset.id], createdAsset, false),
          revalidatePortraitEntries(),
        ]).catch(() => undefined);
      } catch (cause) {
        setError(operationErrorMessage(intl, cause));
        if (asset != null && !assetAttached) {
          await post('/assets/delete', null, { assetId: asset.id }).catch(() => undefined);
        }
      } finally {
        setOperation(null);
      }
    },
    [attachPortraitAsset, characterName, intl, mutate, revalidatePortraitEntries, spaceId],
  );

  const removePortrait = useCallback(
    async (entry: EntryComponentMatch) => {
      const portraitData = parsePortraitComponent(entry.component);
      if (portraitData == null) return;
      setOperation({ type: 'REMOVE', entryId: entry.id });
      setError(null);
      try {
        await patch('/entries/components', null, {
          spaceId,
          scopeId,
          entryId: entry.id,
          messageId: null,
          changes: [
            {
              action: 'REMOVE',
              componentType: PORTRAIT_COMPONENT_TYPE,
              expectedVersion: portraitData.version,
            },
          ],
        }).then(unwrap);
        await revalidatePortraitEntries().catch(() => undefined);
      } catch (cause) {
        setError(operationErrorMessage(intl, cause));
      } finally {
        setOperation(null);
      }
    },
    [intl, revalidatePortraitEntries, scopeId, spaceId],
  );

  const editPortraitMetadata = useCallback(
    async (entry: EntryComponentMatch, key: string, displayName: string) => {
      const nextKey = key.trim();
      const nextDisplayName = displayName.trim();
      if (
        (nextKey === entry.key && nextDisplayName === entry.displayName) ||
        !isValidEntryKey(nextKey) ||
        !isValidEntryDisplayName(nextDisplayName)
      ) {
        return;
      }
      setOperation({ type: 'EDIT_METADATA', entryId: entry.id });
      setError(null);
      try {
        await put('/entries/edit', null, {
          spaceId,
          scopeId,
          entryId: entry.id,
          expectedMetadataVersion: entry.metadataVersion,
          messageId: null,
          key: nextKey,
          aliases: entry.aliases,
          displayName: nextDisplayName,
          referenceNoteId: entry.referenceNoteId,
          tags: entry.tags,
        }).then(unwrap);
        await revalidatePortraitEntries().catch(() => undefined);
      } catch (cause) {
        setError(operationErrorMessage(intl, cause));
      } finally {
        setOperation(null);
      }
    },
    [intl, revalidatePortraitEntries, scopeId, spaceId],
  );

  const movePortrait = useCallback(
    async (activeId: string, overId: string) => {
      const currentEntries = sortPortraitEntries(portraitEntries);
      const activeEntry = currentEntries.find((entry) => entry.id === activeId);
      const reorderedEntries = reorderPortraitEntries(currentEntries, activeId, overId);
      if (
        activeEntry == null ||
        reorderedEntries.every((entry, index) => entry === currentEntries[index])
      ) {
        return;
      }
      const activeIndex = reorderedEntries.findIndex((entry) => entry.id === activeId);
      const beforeEntryId = reorderedEntries[activeIndex + 1]?.id ?? null;
      const optimisticEntries = reorderedEntries.map((entry, index) => {
        const position = currentEntries[index];
        if (position == null) return entry;
        return { ...entry, pos: position.pos, posP: position.posP, posQ: position.posQ };
      });
      setOperation({ type: 'MOVE', entryId: activeId });
      setError(null);
      await mutate(portraitQueryKey, optimisticEntries, false).catch(() => undefined);
      try {
        await put('/entries/move', null, {
          spaceId,
          scopeId,
          entryId: activeId,
          expectedMetadataVersion: activeEntry.metadataVersion,
          beforeEntryId,
        }).then(unwrap);
      } catch (cause) {
        setError(operationErrorMessage(intl, cause));
        await mutate(portraitQueryKey, currentEntries, false);
      } finally {
        await revalidatePortraitEntries().catch(() => undefined);
        setOperation(null);
      }
    },
    [intl, mutate, portraitEntries, portraitQueryKey, revalidatePortraitEntries, scopeId, spaceId],
  );

  return {
    editPortraitMetadata,
    error,
    movePortrait,
    operation,
    removePortrait,
    uploadPortrait,
  };
};
