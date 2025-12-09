import { type FC, useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { type ChannelAtoms } from '../../hooks/useChannelAtoms';
import { useSetAtom } from 'jotai';
import {
  fetchDraftsFromWorker,
  subscribeDraftUpdates,
} from '../../state/compose-backup.worker-client';
import type { ComposeDraftEntry } from '../../state/compose-backup.worker.types';
import { DraftHistoryButton } from './DraftHistoryButton';

interface Props {
  channelId: string;
  inGame: boolean;
  composeAtom: ChannelAtoms['composeAtom'];
  faded?: boolean;
}

export const SelfPreviewPlaceholder: FC<Props> = ({
  channelId,
  inGame,
  composeAtom,
  faded = false,
}) => {
  const [drafts, setDrafts] = useState<ComposeDraftEntry[]>([]);
  const dispatch = useSetAtom(composeAtom);

  useEffect(() => {
    let cancelled = false;
    const loadDrafts = async () => {
      const items = await fetchDraftsFromWorker(channelId);
      if (!cancelled) {
        setDrafts(items);
      }
    };
    void loadDrafts();
    const unsubscribe = subscribeDraftUpdates((updatedChannel) => {
      if (updatedChannel === channelId) {
        void loadDrafts();
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [channelId]);

  const restore = useCallback(
    (text: string) => {
      dispatch({ type: 'setSource', payload: { channelId, source: text } });
    },
    [channelId, dispatch],
  );

  const hasHistory = drafts.length > 0;

  return (
    <span
      className={`flex transition-opacity duration-5000 ${faded ? 'opacity-0' : 'opacity-100'}`}
    >
      <span className="text-text-secondary grow italic">
        {inGame ? (
          <span>
            <FormattedMessage defaultMessage="Tell your adventures" />
          </span>
        ) : (
          <span>
            <FormattedMessage defaultMessage="Type a message" />
          </span>
        )}
      </span>
      {hasHistory && (
        <span className="font-ui ml-2 text-sm">
          <DraftHistoryButton drafts={drafts} onRestore={restore} />
        </span>
      )}
    </span>
  );
};
