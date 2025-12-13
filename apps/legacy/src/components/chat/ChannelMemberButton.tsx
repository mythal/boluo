import { css } from '@emotion/react';
import * as React from 'react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { type ChannelMemberEdited } from '../../actions';
import { type EditChannelMember } from '../../api/channels';
import { post } from '../../api/request';
import Cog from '../../assets/icons/cog.svg';
import DoorOpen from '../../assets/icons/door-open.svg';
import Edit from '../../assets/icons/edit.svg';
import Ninja from '../../assets/icons/ninja.svg';
import { useChannelId } from '../../hooks/useChannelId';
import store, { useDispatch, useSelector } from '../../store';
import { alignRight, mL, mR, mT } from '../../styles/atoms';
import { recordNext } from '../../utils/browser';
import { throwErr } from '../../utils/errors';
import { chatName } from '../../utils/game';
import { type Id } from '../../utils/id';
import { characterNameValidation } from '../../validators';
import Button from '../atoms/Button';
import { ErrorMessage } from '../atoms/ErrorMessage';
import Icon from '../atoms/Icon';
import Input from '../atoms/Input';
import { Label } from '../atoms/Label';
import Menu from '../atoms/Menu';
import { MenuItem, MenuItemLink } from '../atoms/MenuItem';
import Overlay from '../atoms/Overlay';
import Text from '../atoms/Text';
import Dialog from '../molecules/Dialog';
import ChatHeaderButton, { ChatHeaderButtonLink } from './ChatHeaderButton';

const buttonBarStyle = css`
  ${[mT(4)]};
  text-align: right;
`;

interface ChannelMemberOperators {
  join: (characterName?: string) => Promise<void>;
  edit: (characterName?: string) => Promise<void>;
  leave: () => Promise<void>;
}

function useChannelJoinLeave(id: Id): ChannelMemberOperators {
  const dispatch = useDispatch();
  const throwE = throwErr(dispatch);
  const leave = async () => {
    const result = await post('/channels/leave', {}, { id });
    if (result.isOk) {
      dispatch({ type: 'LEFT_CHANNEL', id });
    } else {
      throwE(result.value);
    }
  };
  const join = async (characterName?: string) => {
    const result = await post('/channels/join', {
      channelId: id,
      characterName,
    });
    if (result.isOk) {
      dispatch({ type: 'JOINED_CHANNEL', ...result.value });
    } else {
      throwE(result.value);
    }
  };
  const edit = async (characterName?: string) => {
    const channelId = id;
    if (characterName === undefined) {
      return;
    }
    const result = await post('/channels/edit_member', { characterName, channelId });
    if (result.isOk) {
      const member = result.value;
      dispatch<ChannelMemberEdited>({ type: 'CHANNEL_MEMBER_EDITED', channelId, member });
    } else {
      throwE(result.value);
    }
  };
  return { join, leave, edit };
}

interface Props {
  className?: string;
}

type FormData = Pick<EditChannelMember, 'characterName'>;

function ChannelMemberButton({ className }: Props) {
  const pane = useChannelId();
  const channelId = useSelector((state) => state.chatStates.get(pane)!.channel.id);
  const user = useSelector((state) => state.profile?.user);
  const channelName = useSelector((state) => state.chatStates.get(pane)!.channel.name);
  const spaceMember = useSelector(
    (state) => state.profile?.spaces.get(state.chatStates.get(pane)!.channel.spaceId)?.member,
  );
  const member = useSelector((state) => state.profile?.channels.get(channelId)?.member);
  const nickname = user?.nickname;
  const dispatch = useDispatch();
  const name = chatName(member?.characterName, nickname);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [leaveConfirmDialog, setLeaveConfirmDialog] = useState(false);
  const { leave, join, edit } = useChannelJoinLeave(channelId);
  const toLogin = React.useCallback(() => {
    recordNext();
    location.href = '/login';
  }, []);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const openDialog = () => setDialog(true);
  const dismissDialog = () => setDialog(false);
  const toggleMenu = () => setMenu((value) => !value);
  const dismissMenu = () => setMenu(false);
  const onConfirmJoin = async ({ characterName }: FormData) => {
    await join(characterName);
    dismissDialog();
  };
  const onConfirmLeave = async () => {
    await leave();
    setLeaveConfirmDialog(false);
    setDialog(false);
  };
  const onSubmitEdit = async ({ characterName }: FormData) => {
    await edit(characterName);
    dispatch({ type: 'SET_INPUT_NAME', name: '', pane: channelId });
    dismissDialog();
  };

  const characterNameField = (
    <div>
      <Label htmlFor="characterName">
        角色名<small>（选填）</small>
      </Label>
      <Input
        id="characterName"
        placeholder="例如：甘道夫"
        defaultValue={member?.characterName}
        {...register('characterName', characterNameValidation)}
      />
      {errors.characterName && <ErrorMessage>{errors.characterName.message}</ErrorMessage>}
    </div>
  );

  if (user === undefined) {
    return (
      <ChatHeaderButtonLink css={[mL(1)]} to="/login" onClick={toLogin}>
        登录
      </ChatHeaderButtonLink>
    );
  } else if (!nickname || !spaceMember) {
    return null;
  } else if (!member) {
    return (
      <React.Fragment>
        <ChatHeaderButton className={className} onClick={openDialog}>
          加入频道
        </ChatHeaderButton>
        {dialog && (
          <Dialog title="加入频道" dismiss={dismissDialog} mask>
            <form onSubmit={handleSubmit(onConfirmJoin)}>
              {characterNameField}
              <div css={[mT(4), alignRight]}>
                <Button data-variant="primary" type="submit">
                  加入
                </Button>
              </div>
            </form>
          </Dialog>
        )}
      </React.Fragment>
    );
  }
  return (
    <React.Fragment>
      <ChatHeaderButton
        data-active={menu}
        ref={buttonRef}
        onClick={toggleMenu}
        className={className}
      >
        <Icon icon={Ninja} css={[mR(1)]} />
        {name}
      </ChatHeaderButton>
      {menu && (
        <Overlay
          x={1}
          y={1}
          anchor={buttonRef}
          selfY={1}
          selfX={-1}
          onOuter={dismissMenu}
          onClick={(e) => e.stopPropagation()}
        >
          <Menu dismiss={dismissMenu}>
            <MenuItem icon={Edit} onClick={openDialog}>
              编辑频道身份
            </MenuItem>
            <MenuItemLink to="/settings" icon={Cog}>
              设置
            </MenuItemLink>
            <MenuItem icon={DoorOpen} onClick={() => setLeaveConfirmDialog(true)}>
              退出频道
            </MenuItem>
          </Menu>
        </Overlay>
      )}
      {dialog && (
        <Dialog title="频道成员设置" dismiss={dismissDialog} mask>
          <form onSubmit={handleSubmit(onSubmitEdit)}>
            {characterNameField}
            <div css={buttonBarStyle}>
              <Button data-variant="primary" type="submit">
                提交修改
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {leaveConfirmDialog && (
        <Dialog
          title="退出确认"
          dismiss={() => setLeaveConfirmDialog(false)}
          mask
          confirm={onConfirmLeave}
          confirmText="退出"
        >
          <Text>真的要退出「{channelName}」频道吗？</Text>
        </Dialog>
      )}
    </React.Fragment>
  );
}

export default React.memo(ChannelMemberButton);
