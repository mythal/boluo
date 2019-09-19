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

export interface User {
  nickname: string;
  id: string;
  username: string;
  isOnline: boolean;
}

export interface Loading {
  type: 'LOADING';
}

export interface Guest {
  type: 'GUEST';
}

export interface LoggedIn {
  type: 'LOGGED_IN';
  user: User;
  logout: () => void;
}

export type UserState = Loading | Guest | LoggedIn;

export const useGetMe = (): UserState => {
  const { loading, data, error, updateQuery } = useQuery<{ getMe?: User }>(GET_ME);
  if (loading) {
    return { type: 'LOADING' };
  } else if (error || !data || !data.getMe) {
    localStorage.removeItem(TOKEN_KEY);
    return { type: 'GUEST' };
  } else {
    const logout = () => {
      localStorage.removeItem(TOKEN_KEY);
      updateQuery(() => ({ getMe: undefined }));
    };
    return { type: 'LOGGED_IN', user: data.getMe, logout };
  }
};
