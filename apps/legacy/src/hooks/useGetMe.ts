import { useRef } from 'react';
import useSWR from 'swr';
import { FETCH_FAIL, type AppError } from '../api/error';
import { type ChannelWithMember } from '../api/channels';
import { type AppResult, get } from '../api/request';
import { type SpaceWithMember } from '../api/spaces';
import { type Settings, type User } from '../api/users';
import { type Dispatch, useSelector } from '../store';

type MeSnapshot = {
  user: User;
  settings: Settings;
  mySpaces: SpaceWithMember[];
  myChannels: ChannelWithMember[];
};

export const useGetMe = (dispatch: Dispatch, finish: () => void): void => {
  const baseUrl = useSelector((state) => state.ui.baseUrl);
  const finishedRef = useRef(false);
  useSWR<MeSnapshot | null, AppError>(
    ['legacy/me', baseUrl],
    async () => {
      const unwrapResult = <T>(result: AppResult<T>): T => {
        if (result.isErr) {
          throw result.value;
        }
        return result.value;
      };
      const me = unwrapResult(await get('/users/query', { id: null }));
      if (!me) return null;
      const [settings, spaces] = await Promise.all([
        get('/users/settings').then(unwrapResult),
        get('/spaces/my').then(unwrapResult),
      ]);
      const channelResults = await Promise.all(
        spaces.map((spaceWithMember) =>
          get('/channels/by_space', { id: spaceWithMember.space.id }).then(unwrapResult),
        ),
      );
      const myChannels: ChannelWithMember[] = [];
      for (const channelResult of channelResults) {
        for (const channelWithMember of channelResult) {
          if (channelWithMember.member) {
            myChannels.push({
              channel: channelWithMember.channel,
              member: channelWithMember.member,
            });
          }
        }
      }
      return {
        user: me,
        myChannels,
        mySpaces: spaces,
        settings,
      };
    },
    {
      refreshInterval: 120_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      onErrorRetry: (error, _key, _config, revalidate, context) => {
        if (error.code !== FETCH_FAIL || context.retryCount >= 1) {
          return;
        }
        setTimeout(() => {
          void revalidate({ retryCount: context.retryCount + 1 });
        }, 100);
      },
      onSuccess: (snapshot) => {
        if (!finishedRef.current) {
          finishedRef.current = true;
          finish();
        }
        if (!snapshot) {
          dispatch({ type: 'LOGGED_OUT' });
          return;
        }
        dispatch({ type: 'LOGGED_IN', ...snapshot });
      },
      onError: () => {
        if (!finishedRef.current) {
          finishedRef.current = true;
          finish();
        }
      },
    },
  );
};
