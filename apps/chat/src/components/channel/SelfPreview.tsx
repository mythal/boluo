import type { Preview } from 'api';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, useMemo } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { InGameSwitchButton } from '../compose/InGameSwitchButton';
import { Content } from './Content';
import { Name } from './Name';
import { NameInput } from './NameInput';
import { SelfPreviewSendHelpText } from './SelfPreviewSendHelpText';

interface Props {
  className?: string;
  preview?: Preview;
}

export const SelfPreview: FC<Props> = ({ preview }) => {
  const channelId = useChannelId();
  const member = useMyChannelMember(channelId);
  const isMaster = member?.channel.isMaster ?? false;
  const composeAtom = useComposeAtom();
  const inGame = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ inGame }) => inGame), [composeAtom]),
  );
  const nameInCompose = useAtomValue(
    useMemo(() => selectAtom(composeAtom, (compose) => compose.inputedName), [composeAtom]),
  );
  const name = inGame ? nameInCompose.trim() : (member?.user.nickname ?? preview?.name ?? '');
  const isAction = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ isAction }) => isAction), [composeAtom]),
  );
  const source = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ source }) => source), [composeAtom]),
  );
  const nameNode = useMemo(() => {
    return <Name name={name} isMaster={isMaster} isPreview self />;
  }, [isMaster, name]);

  return (
    <>
      <div className="flex @2xl:flex-col gap-y-1 gap-x-4 items-center @2xl:items-end justify-between @2xl:justify-start">
        <div className="flex-grow flex-shrink-1 truncate @2xl:flex-shrink-0">
          {!isAction && nameNode}
        </div>
        <div className="flex-shrink flex gap-1 h-8">
          {inGame && <NameInput className="text-sm w-[5rem] @xs:w-[7rem] @2xl:w-full " />}
          <InGameSwitchButton iconOnly />
        </div>
      </div>
      <div className="flex flex-col h-full items-between">
        <Content text={source} nameNode={nameNode} isAction={isAction} />
        <SelfPreviewSendHelpText />
      </div>
    </>
  );
};
