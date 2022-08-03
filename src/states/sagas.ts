import { ConnectSpace, LoadSpace, LoadUser, SearchSpaces, SpaceLoaded, UserLoaded } from 'actions';
import { AppResult, get } from '../api/request';
import { all, call, put, takeEvery, takeLatest } from 'redux-saga/effects';
import { User } from '../api/users';
import { Id } from '../utils/id';
import { Space, SpaceWithRelated } from 'api/spaces';

function* connectSpaceSaga(action: ConnectSpace) {
  console.log(action);
  yield put({ type: 'CONNECT_SPACE_SUCCESS', spaceId: action.spaceId });
}

const getUser = async (id: Id): Promise<AppResult<User>> => get('/users/query', { id });

function* loadUserSaga(action: LoadUser) {
  const result: AppResult<User> = yield call(getUser, action.id);
  const loaded: UserLoaded = { type: 'USER_LOADED', result, userId: action.id };
  yield put(loaded);
}

const loadSpace = (id: Id, token?: string) => {
  return get('/spaces/query_with_related', { id, token });
};
function* loadSpaceSaga({ spaceId, token }: LoadSpace) {
  const result: AppResult<SpaceWithRelated> = yield call(loadSpace, spaceId, token);
  const loaded: SpaceLoaded = { type: 'SPACE_LOADED', result, spaceId };
  yield put(loaded);
}

function* loadExploreSpaceSaga() {
  const spaces: AppResult<Space[]> = yield get('/spaces/list');
  yield put({ type: 'EXPLORE_SPACE_LOADED', spaces });
}

function* searchSpacesSaga({ keyword }: SearchSpaces) {
  const spaces: AppResult<Space[]> = yield get('/spaces/search', { search: keyword });
  yield put({ type: 'EXPLORE_SPACE_LOADED', spaces });
}

export function* rootSaga() {
  yield all([
    takeEvery('LOAD_USER', loadUserSaga),
    takeLatest('CONNECT_SPACE', connectSpaceSaga),
    takeEvery('LOAD_SPACE', loadSpaceSaga),
    takeLatest('LOAD_EXPLORE_SPACE', loadExploreSpaceSaga),
    takeLatest('SEARCH_SPACES', searchSpacesSaga),
  ]);
}
