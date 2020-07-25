import { ApplicationState } from './index';
import { Action } from '../actions';
import { updateCache } from '../hooks';
import { SpaceWithRelated } from '../api/spaces';

export const sideEffectReducer = (state: ApplicationState, action: Action) => {
  switch (action.type) {
    case 'JOINED_SPACE':
      updateCache<SpaceWithRelated>(action.space.id, (spaceWithRelated) => {
        const members = spaceWithRelated.members.filter((member) => member.userId !== action.member.userId);
        members.push(action.member);
        return { space: action.space, channels: spaceWithRelated.channels, members };
      });
      break;
    case 'LEFT_SPACE':
      updateCache<SpaceWithRelated>(action.id, (spaceWithRelated) => {
        const { space, channels } = spaceWithRelated;
        const members = spaceWithRelated.members.filter((member) => member.userId !== state.profile?.user.id);
        return { space, members, channels };
      });
      break;
  }
};
