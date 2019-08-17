import React, { useContext, useState } from 'react';
import { useQuery } from '@apollo/react-hooks';
import { gql } from 'apollo-boost';
import { TOKEN_KEY } from './settings';

export interface User {
  type: 'user';
  id: string;
  nickname: string;
  refetch: () => void;
}

export interface Guest {
  type: 'guest';
  refetch: () => void;
}

export interface Loading {
  type: 'loading';
  refetch: () => void;
}

export type UserState = User | Guest | Loading;

export const UserContext = React.createContext<UserState>({
  type: 'guest',
  refetch: () => console.error('empty content refetch'),
});
export const isUserLoading = (state: UserState): state is Loading => state.type === 'loading';
export const isGuest = (state: UserState): state is Guest => state.type === 'guest';
export const isLoggedIn = (state: UserState): state is User => state.type === 'user';

export const useUserState = (): UserState => useContext(UserContext);

const GET_ME = gql`
  {
    getMe {
      id
      nickname
    }
  }
`;

export const useGetMe = () => {
  const { loading, error, data, refetch } = useQuery<{ getMe?: User }>(GET_ME);
  const [userState, setUserState] = useState<UserState>({ type: 'guest', refetch });
  if (loading) {
    if (!isUserLoading(userState)) {
      setUserState({ type: 'loading', refetch });
    }
  } else if (error) {
    if (!isGuest(userState)) {
      setUserState({ type: 'guest', refetch });
    }
    localStorage.removeItem(TOKEN_KEY);
  } else if (data) {
    if (!isLoggedIn(userState)) {
      if (data.getMe) {
        setUserState({ ...data.getMe, refetch, type: 'user' });
      }
    }
  }
  return userState;
};
