import type { FC } from 'react';
import { useEffect } from 'react';
import { Suspense } from 'react';
import { Loading } from 'ui';
import { useSpace } from '../../hooks/useSpace';
import { useDispatch } from '../../state/chat';
import { PaneProvider, usePanes } from '../../state/panes';
import { ChatView } from './ChatView';

interface Props {
  spaceId: string;
}

const Chat: FC<Props> = ({ spaceId }) => {
  const space = useSpace(spaceId);
  const { panes, dispatch, focused } = usePanes(spaceId);
  const chatDispatch = useDispatch();
  useEffect(() => chatDispatch('enterSpace', { spaceId }), [chatDispatch, spaceId]);

  return (
    <Suspense fallback={<Loading />}>
      <PaneProvider dispatch={dispatch} focused={focused}>
        <ChatView space={space} panes={panes} focused={focused} />
      </PaneProvider>
    </Suspense>
  );
};

// To facilitate lazy loading, use the default export
export default Chat;
