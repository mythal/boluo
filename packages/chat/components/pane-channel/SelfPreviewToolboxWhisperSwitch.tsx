import { FC } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { SelfPreviewToolboxSwitch } from './SelfPreviewToolboxSwitch';
import { useAtomValue, useSetAtom } from 'jotai';
import { FormattedMessage } from 'react-intl';
import { Whisper } from 'icons';
import { useFloating } from '@floating-ui/react';
import { SelfPreviewToolboxWhisper } from './SelfPreviewToolboxWhisper';
import { ChannelMember } from 'api';
import { useMe } from 'common';

interface Props {
  channelMember: ChannelMember;
}

export const SelfPreviewToolboxWhisperSwitch: FC<Props> = ({ channelMember: myChannelMember }) => {
  const me = useMe();

  const { composeAtom, isWhisperAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);

  const isWhisper = useAtomValue(isWhisperAtom);
  const { refs, update, floatingStyles } = useFloating({
    placement: 'top-end',
  });
  return (
    <>
      <div ref={refs.setReference}>
        <SelfPreviewToolboxSwitch
          checked={isWhisper}
          icon={Whisper}
          onChange={() =>
            dispatch({
              type: 'toggleWhisper',
              payload: me == null || me === 'LOADING' ? {} : { username: me.user.username },
            })
          }
        >
          <FormattedMessage defaultMessage="Whisper" />
        </SelfPreviewToolboxSwitch>
      </div>
      {isWhisper && (
        <div style={floatingStyles} ref={refs.setFloating}>
          <SelfPreviewToolboxWhisper updateFloating={update} myChannelMember={myChannelMember} />
        </div>
      )}
    </>
  );
};
