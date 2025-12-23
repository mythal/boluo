import { useCallback, useMemo, type FC, type MouseEventHandler } from 'react';
import { useQueryChannel } from '@boluo/hooks/useQueryChannel';
import { SomethingWentWrong } from '@boluo/ui/SomethingWentWrong';
import { useIntl } from 'react-intl';
import clsx from 'clsx';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import ChevronUp from '@boluo/icons/ChevronUp';
import Edit from '@boluo/icons/Edit';
import Icon from '@boluo/ui/Icon';
import { useQueryChannelMembers } from '@boluo/hooks/useQueryChannelMembers';
import { MemberWithUser } from '@boluo/api';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { usePaneKey } from '../../hooks/usePaneKey';
import { atom, useAtomValue } from 'jotai';
import { panesAtom } from '../../state/view.atoms';
import { useMember } from '../../hooks/useMember';

interface Props {
  channelId: string;
  dismiss: () => void;
}

const classes = {
  box: 'bg-pane-header-bg pl-pane py-2 text-sm pr-1.5',
};

export const ChannelHeaderTopic: FC<Props> = ({ channelId, dismiss }) => {
  const { data: channel, isLoading } = useQueryChannel(channelId);
  const member = useMember();
  const toggleChildPane = usePaneToggle({ child: '1/3' });
  const paneKey = usePaneKey();
  const topicPaneOpened = useAtomValue(
    useMemo(
      () =>
        atom((read) => {
          const panes = read(panesAtom);
          const currentPane = panes.find((pane) => pane.key === paneKey);
          return (
            currentPane?.child?.pane.type === 'CHANNEL_TOPIC' &&
            currentPane.child.pane.channelId === channelId
          );
        }),
      [channelId, paneKey],
    ),
  );
  const intl = useIntl();
  const handleEditClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.stopPropagation();
      toggleChildPane({ type: 'CHANNEL_TOPIC', channelId });
    },
    [channelId, toggleChildPane],
  );
  if (isLoading) {
    return <div className={classes.box}>...</div>;
  } else if (!channel) {
    return (
      <div className={classes.box}>
        <SomethingWentWrong />
      </div>
    );
  }
  const topic =
    channel.topic.trim().length > 0 ? (
      <div>{channel.topic}</div>
    ) : (
      <div className="text-text-subtle">
        {intl.formatMessage({ defaultMessage: 'No topic set' })}
      </div>
    );
  return (
    <div className={clsx(classes.box, 'flex items-start gap-1')}>
      <div className="text-text-secondary shrink grow whitespace-pre-line">{topic}</div>
      {member && (member.space.isAdmin || member.channel.isMaster) && (
        <PaneHeaderButton
          icon={<Icon icon={Edit} />}
          size="small"
          onClick={handleEditClick}
          active={topicPaneOpened}
          className="shrink-0"
        >
          {intl.formatMessage({ defaultMessage: 'Edit' })}
        </PaneHeaderButton>
      )}
      <PaneHeaderButton icon={<Icon icon={ChevronUp} />} size="small" onClick={dismiss} />
    </div>
  );
};
