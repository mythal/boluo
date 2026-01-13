import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { useSWRConfig } from 'swr';
import type { ChannelMembers, UserStatus } from '@boluo/api';
import { chatAtom, chatEffectsAtom } from '../state/chat.atoms';
import type { ChatEffect } from '../state/chat.types';

const applyEffect = async (
  effect: ChatEffect,
  mutate: ReturnType<typeof useSWRConfig>['mutate'],
): Promise<void> => {
  switch (effect.type) {
    case 'CLOSE_CONNECTION':
      effect.connection.onclose = null;
      if (
        effect.connection.readyState !== WebSocket.CLOSING &&
        effect.connection.readyState !== WebSocket.CLOSED
      ) {
        effect.connection.close();
      }
      return;
    case 'CHANNEL_CHANGED':
      if (effect.channel == null) {
        await mutate(['/channels/by_space', effect.spaceId]);
        await mutate(['/channels/query', effect.channelId]);
        return;
      }
      await mutate(['/channels/by_space', effect.spaceId]);
      await mutate(['/channels/query', effect.channelId], effect.channel);
      return;
    case 'SPACE_CHANGED':
      await mutate(['/spaces/query', effect.spaceId], effect.space);
      await mutate(['/channels/by_space', effect.spaceId]);
      return;
    case 'MEMBERS_UPDATED':
      await mutate<ChannelMembers>(['/channels/members', effect.channelId], (channelMembers) => {
        if (channelMembers != null) {
          return { ...channelMembers, members: effect.members };
        }
      });
      return;
    case 'STATUS_UPDATED':
      await mutate<Record<string, UserStatus | undefined>>(
        ['/spaces/users_status', effect.spaceId],
        effect.statusMap,
      );
      return;
  }
};

export const useChatEffects = () => {
  const effects = useAtomValue(chatEffectsAtom);
  const dispatch = useSetAtom(chatAtom);
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (effects.length === 0) return;
    let active = true;
    const run = async () => {
      for (const effect of effects) {
        await applyEffect(effect, mutate);
      }
      if (!active) return;
      dispatch({
        type: 'effectsHandled',
        payload: { effectIds: effects.map((effect) => effect.id) },
      });
    };
    void run();
    return () => {
      active = false;
    };
  }, [dispatch, effects, mutate]);
};
