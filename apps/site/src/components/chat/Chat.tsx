import type { FC } from 'react';
import { Suspense } from 'react';
import { Loading } from 'ui';
import type { ChildrenProps } from '../../helper/props';
import { SpaceConnectionStateContext } from '../../hooks/useChatConnection';
import { useSpace } from '../../hooks/useSpace';
import { ChatStateProvider } from '../../state/chat';
import { useConnectionState } from '../../state/connection';
import { PaneProvider, usePanes } from '../../state/panes';
import { ChatView } from './ChatView';

interface ProviderProps extends ChildrenProps {
  mailboxId: string;
}

const ChatConnectionProvider: FC<ProviderProps> = ({ mailboxId, children }) => {
  const state = useConnectionState(mailboxId);
  return <SpaceConnectionStateContext.Provider value={state}>{children}</SpaceConnectionStateContext.Provider>;
};

interface Props {
  spaceId: string;
}

const Chat: FC<Props> = ({ spaceId }) => {
  const space = useSpace(spaceId);
  const { panes, dispatch, focused } = usePanes(spaceId);

  return (
    <Suspense fallback={<Loading />}>
      <PaneProvider dispatch={dispatch} focused={focused}>
        <ChatConnectionProvider mailboxId={spaceId}>
          <ChatStateProvider spaceId={spaceId}>
            <ChatView space={space} panes={panes} focused={focused} />
          </ChatStateProvider>
        </ChatConnectionProvider>
      </PaneProvider>
    </Suspense>
  );
};

// To facilitate lazy loading, use the default export
export default Chat;
