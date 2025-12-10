import { uploadWithPresigned } from '../../../api/request';
import { type Dispatch } from '../../../store';
import { throwErr } from '../../../utils/errors';
import { type Id } from '../../../utils/id';

export const uploadMedia = async (
  dispatch: Dispatch,
  media: File | string | undefined,
): Promise<Id | null> => {
  if (!media) {
    return null;
  }
  if (typeof media === 'string') {
    return media;
  }
  const result = await uploadWithPresigned(media, media.name, media.type);
  if (!result.isOk) {
    throwErr(dispatch)(result.value);
    return null;
  }
  return result.value.mediaId;
};
