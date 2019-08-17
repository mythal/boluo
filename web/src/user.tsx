import React, { useContext, useState } from 'react';
import { useQuery } from '@apollo/react-hooks';
import { gql } from 'apollo-boost';
import { TOKEN_KEY } from './settings';

export interface User {
  id: string;
  nickname: string;
}

export type UserState = 'guest' | 'loading' | User;
export const UserContext = React.createContext<UserState>('guest');
export const isUserLoading = (state: UserState): state is 'loading' => state === 'loading';
export const isGuest = (state: UserState): state is 'guest' => state === 'guest';
export const isLoggedIn = (state: UserState): state is User => state !== 'guest' && state !== 'loading';
export const useUserState = (): UserState => {
  return useContext(UserContext);
};
export const useGetMe = () => {
  const [userState, setUserState] = useState<UserState>('guest');
  const { loading, error, data } = useQuery<{ getMe?: User }>(
    gql`
      {
        getMe {
          id
          nickname
        }
      }
    `
  );
  if (loading) {
    if (userState !== 'loading') {
      setUserState('loading');
    }
  } else if (error) {
    if (userState !== 'guest') {
      setUserState('guest');
    }
    localStorage.removeItem(TOKEN_KEY);
  } else if (data) {
    if (userState === 'loading' || userState === 'guest') {
      if (data.getMe) setUserState(data.getMe);
    }
  }
  return userState;
};
