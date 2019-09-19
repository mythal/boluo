import gql from 'graphql-tag';
import { useQuery } from '@apollo/react-hooks';
import { TOKEN_KEY } from './settings';

const GET_ME = gql`
  query {
    getMe {
      username
      nickname
      id
      isOnline
    }
  }
`;

export enum UserState {
  Loading,
  Guest,
  LoggedIn,
}

export interface User {
  nickname: string;
  id: string;
  username: string;
  isOnline: boolean;
}

export interface Loading {
  state: UserState.Loading;
}

export interface Guest {
  state: UserState.Guest;
}

export interface LoggedIn {
  state: UserState.LoggedIn;
  user: User;
  logout: () => void;
}

export type GetMe = Loading | Guest | LoggedIn;

export const useGetMe = (): GetMe => {
  const { loading, data, error, updateQuery } = useQuery<{ getMe?: User }>(GET_ME);
  if (loading) {
    return { state: UserState.Loading };
  } else if (error || !data || !data.getMe) {
    localStorage.removeItem(TOKEN_KEY);
    return { state: UserState.Guest };
  } else {
    const logout = () => {
      localStorage.removeItem(TOKEN_KEY);
      updateQuery(() => ({ getMe: undefined }));
    };
    return { state: UserState.LoggedIn, user: data.getMe, logout };
  }
};
