import React, { useContext, useEffect, useReducer, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Action } from '../actions';
import { get } from '../api/request';
import { Loading } from './Loading';
import { panic } from '../errors';
import { Channel, Member } from '../api/channels';
import { ChatState, initChatState } from '../reducers/chat';
import { initProfileState, ProfileState } from '../reducers/profile';
import { InformationState, initInformationState } from '../reducers/information';
import { applicationReducer, initApplicationState } from '../reducers';
import { LoggedIn, LoggedOut } from '../actions/profile';

const DispatchContext = React.createContext<(action: Action) => void>(panic);

export type Dispatch = <T extends Action>(action: T) => void;
export const useDispatch = (): Dispatch => useContext(DispatchContext);

const ProfileContext = React.createContext<ProfileState | undefined>(initProfileState);
export const useProfile = (): ProfileState | undefined => useContext(ProfileContext);

const InformationContext = React.createContext<InformationState>(initInformationState);
export const useInformationSet = (): InformationState => useContext(InformationContext);

const ChatContext = React.createContext<ChatState | undefined>(initChatState);
export const useChat = (): ChatState | undefined => useContext(ChatContext);

const ChannelContext = React.createContext<Channel | undefined>(undefined);
export const useChannel = (): Channel | undefined => useContext(ChannelContext);

const ChannelMemberContext = React.createContext<Member[] | undefined>(undefined);
export const useChannelMember = (): Member[] | undefined => useContext(ChannelMemberContext);

const useGetMe = (dispatch: Dispatch, finish: () => void): void => {
  useEffect(() => {
    (async () => {
      const me = await get('/users/get_me');
      if (me.isOk && me.value !== null) {
        const { user, mySpaces, myChannels } = me.value;
        dispatch<LoggedIn>({ type: 'LOGGED_IN', user, myChannels, mySpaces });
      } else {
        dispatch<LoggedOut>({ type: 'LOGGED_OUT' });
      }
      finish();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export const Provider: React.FC = ({ children }) => {
  const [state, dispatch] = useReducer(applicationReducer, initApplicationState);
  const [loading, setLoading] = useState(true);
  useGetMe(dispatch, () => setLoading(false));
  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center">
        <Loading className="mx-auto w-32" />
      </div>
    );
  }
  return (
    <DispatchContext.Provider value={dispatch}>
      <ProfileContext.Provider value={state.profile}>
        <InformationContext.Provider value={state.information}>
          <ChatContext.Provider value={state.chat}>
            <ChannelContext.Provider value={state.chat?.channel}>
              <ChannelMemberContext.Provider value={state.chat?.members}>
                <BrowserRouter>{children}</BrowserRouter>
              </ChannelMemberContext.Provider>
            </ChannelContext.Provider>
          </ChatContext.Provider>
        </InformationContext.Provider>
      </ProfileContext.Provider>
    </DispatchContext.Provider>
  );
};
