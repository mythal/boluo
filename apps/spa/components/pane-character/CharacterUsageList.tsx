import type { Channel, User } from '@boluo/api';
import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';
import { useQueryCharacterUsages } from '@boluo/hooks/useQueryCharacterUsages';
import Hash from '@boluo/icons/Hash';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { Avatar } from '@boluo/ui/users/Avatar';
import { useAtomValue } from 'jotai';
import { useMemo, type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { panesAtom } from '../../state/view.atoms';

interface Props {
  spaceId: string;
  characterId: string;
}

interface UsagesByUser {
  user: User;
  channels: Channel[];
}

export const CharacterUsageList: FC<Props> = ({ spaceId, characterId }) => {
  const { data: usages, error, isLoading } = useQueryCharacterUsages(spaceId, characterId);
  const { data: appSettings } = useQueryAppSettings();
  const togglePane = usePaneToggle();
  const panes = useAtomValue(panesAtom);
  const usagesByUser = useMemo(() => {
    const groups = new Map<string, UsagesByUser>();
    for (const { channel, user } of usages ?? []) {
      const group = groups.get(user.id);
      if (group) {
        group.channels.push(channel);
      } else {
        groups.set(user.id, { user, channels: [channel] });
      }
    }
    return Array.from(groups.values());
  }, [usages]);

  const isChannelOpen = (channelId: string): boolean =>
    panes.some(
      (pane) =>
        (pane.type === 'CHANNEL' && pane.channelId === channelId) ||
        (pane.child?.pane.type === 'CHANNEL' && pane.child.pane.channelId === channelId),
    );

  if (!isLoading && !error && usages?.length === 0) {
    return <div className="border-border-subtle border-t" />;
  }

  return (
    <section className="px-pane border-border-subtle border-t py-3">
      <h3 className="mb-2 text-sm font-medium">
        <FormattedMessage defaultMessage="Used by" />
      </h3>
      {isLoading && <div className="text-text-muted text-sm">…</div>}
      {error && (
        <div className="text-state-warning-text text-sm">
          <FormattedMessage defaultMessage="Character usage could not be loaded." />
        </div>
      )}
      {usages != null && usages.length > 0 && (
        <ul className="space-y-2">
          {usagesByUser.map(({ channels, user }) => (
            <li
              key={user.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
            >
              <Avatar
                id={user.id}
                name={user.nickname}
                avatarId={user.avatarId}
                size="2rem"
                className="rounded-sm"
                mediaUrl={appSettings?.mediaUrl}
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{user.nickname}</div>
                <div className="text-text-muted truncate text-xs">@{user.username}</div>
              </div>
              <div className="flex max-w-48 flex-wrap justify-end gap-x-2 gap-y-1">
                {channels.map((channel) => (
                  <ButtonInline
                    key={channel.id}
                    aria-pressed={isChannelOpen(channel.id)}
                    onClick={() => togglePane({ type: 'CHANNEL', channelId: channel.id })}
                  >
                    <Hash />
                    <span className="max-w-32 truncate">{channel.name}</span>
                  </ButtonInline>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
