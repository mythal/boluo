import type { AccessPolicy, ChannelWithMaybeMember } from '@boluo/api';
import { useQueryChannelList } from '@boluo/hooks/useQueryChannelList';
import { Select } from '@boluo/ui/Select';
import type { FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

const policies: AccessPolicy[] = ['PUBLIC', 'COLLABORATIVE', 'PERSONAL', 'SECRET', 'GAME_MASTER'];

const useAccessPolicyLabels = (): Record<AccessPolicy, string> => {
  const intl = useIntl();
  return {
    PUBLIC: intl.formatMessage({ defaultMessage: 'Public' }),
    COLLABORATIVE: intl.formatMessage({ defaultMessage: 'Collaborative' }),
    PERSONAL: intl.formatMessage({ defaultMessage: 'Personal' }),
    SECRET: intl.formatMessage({ defaultMessage: 'Secret' }),
    GAME_MASTER: intl.formatMessage({ defaultMessage: 'Game masters' }),
  };
};

const AccessPolicyDescription: FC<{ policy: AccessPolicy }> = ({ policy }) => {
  switch (policy) {
    case 'PUBLIC':
      return (
        <FormattedMessage defaultMessage="Visible to everyone with access. Only the owner, game masters, and space managers can edit it." />
      );
    case 'COLLABORATIVE':
      return (
        <FormattedMessage defaultMessage="Visible to everyone with access. Every member in scope can edit and portray it." />
      );
    case 'PERSONAL':
      return <FormattedMessage defaultMessage="Only the owner can view, edit, and portray it." />;
    case 'SECRET':
      return (
        <FormattedMessage defaultMessage="Only the owner and game masters can view, edit, and portray it." />
      );
    case 'GAME_MASTER':
      return (
        <FormattedMessage defaultMessage="Only game masters can view, edit, and portray it." />
      );
  }
};

interface Props {
  channels: ChannelWithMaybeMember[] | undefined;
  isLoading: boolean;
  accessPolicy: AccessPolicy;
  accessChannelId: string | null;
  disabled: boolean;
  canUseAccess: (policy: AccessPolicy, channelId: string | null) => boolean;
  onAccessPolicyChange: (policy: AccessPolicy) => void;
  onAccessChannelIdChange: (channelId: string | null) => void;
}

export const CharacterAccessFields: FC<Props> = ({
  channels,
  isLoading,
  accessPolicy,
  accessChannelId,
  disabled,
  canUseAccess,
  onAccessPolicyChange,
  onAccessChannelIdChange,
}) => {
  const intl = useIntl();
  const policyLabels = useAccessPolicyLabels();

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-text-secondary mb-3 text-sm font-medium">
        <FormattedMessage defaultMessage="Access and permissions" />
      </legend>
      <div className="grid gap-3 @md:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-text-secondary text-sm">
            <FormattedMessage defaultMessage="Permission" />
          </span>
          <Select
            value={accessPolicy}
            disabled={disabled || isLoading}
            onChange={(event) => onAccessPolicyChange(event.target.value as AccessPolicy)}
          >
            {policies.map((policy) => (
              <option key={policy} value={policy} disabled={!canUseAccess(policy, accessChannelId)}>
                {policyLabels[policy]}
              </option>
            ))}
          </Select>
          <span className="text-text-muted text-xs">
            <AccessPolicyDescription policy={accessPolicy} />
          </span>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-text-secondary text-sm">
            <FormattedMessage defaultMessage="Access scope" />
          </span>
          <Select
            value={accessChannelId ?? ''}
            disabled={disabled || isLoading}
            onChange={(event) => onAccessChannelIdChange(event.target.value || null)}
          >
            <option value="" disabled={!canUseAccess(accessPolicy, null)}>
              {intl.formatMessage({ defaultMessage: 'Entire space' })}
            </option>
            {channels?.map(({ channel }) => (
              <option
                key={channel.id}
                value={channel.id}
                disabled={!canUseAccess(accessPolicy, channel.id)}
              >
                {channel.name}
              </option>
            ))}
          </Select>
          <span className="text-text-muted text-xs">
            <FormattedMessage defaultMessage="A channel scope uses membership and game-master status from that channel." />
          </span>
        </label>
      </div>
    </fieldset>
  );
};

export const CharacterAccessSummary: FC<{
  spaceId: string;
  accessPolicy: AccessPolicy;
  accessChannelId: string | null;
}> = ({ spaceId, accessPolicy, accessChannelId }) => {
  const labels = useAccessPolicyLabels();

  return (
    <div className="text-text-muted flex flex-wrap items-center gap-x-1 text-xs">
      <span>{labels[accessPolicy]}</span>
      <span aria-hidden>·</span>
      {accessChannelId == null ? (
        <FormattedMessage defaultMessage="Entire space" />
      ) : (
        <CharacterAccessChannelSummary spaceId={spaceId} accessChannelId={accessChannelId} />
      )}
    </div>
  );
};

const CharacterAccessChannelSummary: FC<{ spaceId: string; accessChannelId: string }> = ({
  spaceId,
  accessChannelId,
}) => {
  const { data: channels } = useQueryChannelList(spaceId);
  const channel = channels?.find(({ channel }) => channel.id === accessChannelId)?.channel;
  return channel == null ? (
    <FormattedMessage defaultMessage="Restricted to a channel" />
  ) : (
    <FormattedMessage defaultMessage="Channel: {channel}" values={{ channel: channel.name }} />
  );
};
