import { upload } from '../../../api/request';
import { Dispatch } from '../../../store';
import { throwErr } from '../../../utils/errors';
import { Id } from '../../../utils/id';

export const uploadMedia = async (dispatch: Dispatch, media: File | undefined): Promise<Id | null> => {
  if (!media) {
    return null;
  }
  const result = await upload(media, media.name, media.type);
  if (!result.isOk) {
    throwErr(dispatch)(result.value);
    return null;
  }
  return result.value.id;
};
