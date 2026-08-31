import * as React from 'react';
import { useCallback } from 'react';
import { type ChannelMember } from '../../../api/channels';
import { useDispatch, useSelector } from '../../../store';
import { type Id } from '../../../utils/id';
import { handleKeyDown } from '../key';
import MessageMedia from '../MessageMedia';
import { AddDiceButton } from './AddDiceButton';
import BroadcastSwitch from './BroadcastSwitch';
import ComposeInput from './ComposeInput';
import { Editing } from './Editing';
import InGameButton from './InGameButton';
import { SendButton } from './SendButton';
import { useOnSend } from './useOnSend';

const containerClassName =
  "relative grid [grid-row:compose-start/compose-end] grid-cols-[1fr_auto_auto] [grid-template-areas:'edit_toolbar_send'_'input_input_input'] items-end gap-2 bg-legacy-compose-background px-2 py-2 focus-within:bg-legacy-blue-900 md:grid-cols-[auto_1fr_auto] md:[grid-template-areas:'edit_edit_edit'_'toolbar_input_send'] md:gap-x-2 md:gap-y-0";

interface Props {
  channelId: Id;
  member: ChannelMember;
}

function Compose({ channelId }: Props) {
  const media = useSelector((state) => state.chatStates.get(channelId)?.compose.media);
  const isEditing = useSelector((state) => Boolean(state.chatStates.get(channelId)?.compose.edit));
  const onSend = useOnSend();
  const dispatch = useDispatch();
  const setInGame = useCallback(
    (inGame: boolean | 'TOGGLE') => dispatch({ type: 'SET_IN_GAME', pane: channelId, inGame }),
    [channelId, dispatch],
  );
  const enterSend = useSelector((state) => state.profile?.settings.enterSend);
  return (
    <div className={containerClassName}>
      {isEditing && <Editing className="mb-[0.25em] [grid-area:edit]" />}
      <div className="flex [grid-area:toolbar]">
        <BroadcastSwitch size="large" className="mr-1" />
        <InGameButton className="mr-1" />
        <AddDiceButton inCompose />
      </div>
      <div
        className="relative flex w-full [grid-area:input]"
        onKeyDown={handleKeyDown(onSend, () => setInGame('TOGGLE'), enterSend)}
      >
        <ComposeInput
          autoFocus
          autoSize
          className="bg-legacy-gray-900 text-legacy-text h-10 min-h-full w-full resize-none rounded-[3px] border-0 p-2 text-[1rem] focus:outline-none"
        />
      </div>
      {media && (
        <div className="absolute top-0 right-16 translate-y-[-90%] rotate-25 rounded-[3px] border border-solid border-white">
          <MessageMedia
            file={media instanceof File ? media : undefined}
            mediaId={typeof media === 'string' ? media : undefined}
          />
        </div>
      )}
      <div className="[grid-area:send]">
        <SendButton onSend={onSend} editing={isEditing} />
      </div>
    </div>
  );
}

export default React.memo(Compose);
