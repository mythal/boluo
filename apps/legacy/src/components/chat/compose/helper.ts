import { uploadWithPresigned } from '../../../api/request';
import { Dispatch } from '../../../store';
import { throwErr } from '../../../utils/errors';
import { Id } from '../../../utils/id';

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
