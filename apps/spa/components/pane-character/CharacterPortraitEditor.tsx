import type { EntryComponentMatch } from '@boluo/api';
import Plus from '@boluo/icons/Plus';
import Trash from '@boluo/icons/Trash';
import Upload from '@boluo/icons/Upload';
import { Button } from '@boluo/ui/Button';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import {
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  SortableContext,
} from '@dnd-kit/sortable';
import { type ChangeEvent, type FC, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import { mediaMaxSizeMb, supportedMediaType } from '../../media';
import {
  CharacterPortrait,
  characterPortraitSizeClassName,
  portraitSourceFromEntry,
} from './CharacterPortrait';
import { CharacterPortraitMetadataForm } from './CharacterPortraitMetadataForm';
import { sortPortraitEntries } from './portrait';
import { SortableCharacterPortrait } from './SortableCharacterPortrait';
import { useCharacterPortraitMutation } from './useCharacterPortraitMutation';

interface Props {
  spaceId: string;
  scopeId: string;
  characterName: string;
  portraitEntries: EntryComponentMatch[] | undefined;
  portraitQueryFailed: boolean;
  portraitQueryLoading: boolean;
}

const ACCEPTED_IMAGE_TYPES = supportedMediaType.join(',');

type PortraitUploadState =
  | { type: 'IDLE' }
  | { type: 'PICKING'; targetEntryId: string | null }
  | { type: 'UPLOADING'; file: File; targetEntryId: string | null };

export const CharacterPortraitEditor: FC<Props> = ({
  spaceId,
  scopeId,
  characterName,
  portraitEntries,
  portraitQueryFailed,
  portraitQueryLoading,
}) => {
  const intl = useIntl();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<PortraitUploadState>({ type: 'IDLE' });
  const previewFile = uploadState.type === 'UPLOADING' ? uploadState.file : null;
  const previewUrl = useObjectUrl(previewFile);
  const entries = useMemo(() => sortPortraitEntries(portraitEntries), [portraitEntries]);
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];
  const { editPortraitMetadata, error, movePortrait, operation, removePortrait, uploadPortrait } =
    useCharacterPortraitMutation({
      spaceId,
      scopeId,
      characterName,
      portraitEntries: entries,
    });
  const disabled = operation != null || portraitQueryLoading || portraitQueryFailed;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const openFilePicker = (entry?: EntryComponentMatch) => {
    setUploadState({ type: 'PICKING', targetEntryId: entry?.id ?? null });
    inputRef.current?.click();
  };

  const uploadSelectedPortrait = async (file: File, targetEntryId: string | null) => {
    setUploadState({ type: 'UPLOADING', file, targetEntryId });
    try {
      const entry = entries.find((item) => item.id === targetEntryId);
      await uploadPortrait(file, entry);
    } finally {
      setUploadState({ type: 'IDLE' });
      if (inputRef.current != null) inputRef.current.value = '';
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file == null) return;
    const targetEntryId = uploadState.type === 'PICKING' ? uploadState.targetEntryId : null;
    void uploadSelectedPortrait(file, targetEntryId);
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setSelectedEntryId(String(active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over == null || active.id === over.id) return;
    void movePortrait(String(active.id), String(over.id));
  };

  return (
    <section className="p-pane border-border-subtle border-b">
      <h3 className="text-text-secondary mb-2 text-sm">
        <FormattedMessage defaultMessage="Portraits" />
      </h3>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={entries.map((entry) => entry.id)}
          strategy={horizontalListSortingStrategy}
          disabled={disabled}
        >
          <div className="flex items-end gap-3 overflow-x-auto p-1 pb-3">
            {entries.map((entry, index) => {
              let source = portraitSourceFromEntry(entry);
              if (uploadState.type === 'UPLOADING' && uploadState.targetEntryId === entry.id) {
                source =
                  previewUrl == null
                    ? { type: 'LOADING' }
                    : { type: 'PREVIEW', url: previewUrl, busy: true };
              }
              return (
                <SortableCharacterPortrait
                  key={entry.id}
                  spaceId={spaceId}
                  characterName={characterName}
                  entry={entry}
                  index={index}
                  source={source}
                  selected={entry.id === selectedEntry?.id}
                  disabled={disabled}
                  onSelect={setSelectedEntryId}
                />
              );
            })}
            {uploadState.type === 'UPLOADING' && uploadState.targetEntryId == null && (
              <CharacterPortrait
                spaceId={spaceId}
                characterName={characterName}
                source={
                  previewUrl == null
                    ? { type: 'LOADING' }
                    : { type: 'PREVIEW', url: previewUrl, busy: true }
                }
                size={entries.length === 0 ? 'main' : 'gallery'}
              />
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => openFilePicker()}
              className={`border-border-default text-text-muted hover:bg-surface-strong hover:text-text-secondary focus-visible:ring-border-focus flex aspect-3/4 ${characterPortraitSizeClassName.gallery} shrink-0 flex-col items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm focus-visible:ring enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Plus className="h-6 w-6" />
              <FormattedMessage defaultMessage="Add portrait" />
            </button>
          </div>
        </SortableContext>
      </DndContext>

      <div className="text-text-muted mt-1 text-sm">
        <FormattedMessage
          defaultMessage="PNG, JPEG, GIF, or WebP. Up to {sizeLimit} MB."
          values={{ sizeLimit: mediaMaxSizeMb }}
        />
      </div>

      {selectedEntry != null && (
        <div className="mt-1">
          <div className="flex justify-end gap-2">
            <Button small disabled={disabled} onClick={() => openFilePicker(selectedEntry)}>
              <Upload />
              <FormattedMessage defaultMessage="Replace" />
            </Button>
            <Button
              small
              variant="danger"
              disabled={disabled}
              onClick={() => void removePortrait(selectedEntry)}
            >
              <Trash />
              <FormattedMessage defaultMessage="Remove" />
            </Button>
          </div>
          <CharacterPortraitMetadataForm
            key={`${selectedEntry.id}:${selectedEntry.metadataVersion}`}
            entry={selectedEntry}
            disabled={disabled}
            onSubmit={({ entry, key, displayName }) =>
              void editPortraitMetadata(entry, key, displayName)
            }
          />
        </div>
      )}
      {portraitQueryFailed && (
        <div className="text-state-warning-text mt-2 text-sm">
          <FormattedMessage defaultMessage="Portraits could not be loaded." />
        </div>
      )}
      {error != null && (
        <div className="mt-2">
          <ErrorMessageBox>{error}</ErrorMessageBox>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        hidden
        aria-label={intl.formatMessage({ defaultMessage: 'Choose portrait image' })}
        onChange={onFileChange}
      />
    </section>
  );
};
