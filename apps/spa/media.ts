import { type FetchFailError, type ApiError } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { Err, Ok, timeout, type Result } from '@boluo/utils';
import { recordError, recordWarn } from './error';

export const mediaMaxSizeMb = 8;
export const mediaMaxSizeByte = mediaMaxSizeMb * 1024 * 1024;

export const supportedMediaType = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

interface S3Error {
  type: 'S3_ERROR';
  err: Response;
}

export const makeMediaPublicUrl = (raw: unknown) => {
  if (typeof raw !== 'string') {
    throw new Error('The public media URL is not defined');
  }
  let url = raw;
  if (url.endsWith('/')) {
    url = raw.slice(0, -1);
  }
  try {
    new URL(url);
  } catch (e) {
    throw new Error('The public media URL is not valid');
  }
  return url;
};

export function getMediaUrl(mediaPublicUrl: string, mediaId: string): string {
  return `${mediaPublicUrl}/${mediaId}`;
}

async function uploadImageToS3(
  file: File,
  presignedUrl: string,
): Promise<Result<void, S3Error | FetchFailError>> {
  // Use the fetch API to upload the image
  let response: Response;
  try {
    response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
  } catch (e) {
    const fetchFailError: FetchFailError = { code: 'FETCH_FAIL', cause: e };
    return new Err(fetchFailError);
  }

  if (!response.ok) {
    recordWarn('Failed to upload the image to S3', { response });
    return new Err({ type: 'S3_ERROR', err: response });
  }
  return new Ok(undefined);
}

export type MediaError = 'MEDIA_TOO_LARGE' | 'MEDIA_TYPE_NOT_SUPPORTED';

export const validateMedia = (file: File | string | null | undefined): Result<void, MediaError> => {
  if (typeof file === 'string') {
    return new Ok(undefined);
  }
  if (file == null) {
    return new Ok(undefined);
  }
  if (file.size > mediaMaxSizeByte) {
    return new Err('MEDIA_TOO_LARGE');
  }
  if (!supportedMediaType.includes(file.type)) {
    return new Err('MEDIA_TYPE_NOT_SUPPORTED');
  }
  return new Ok(undefined);
};

interface PreSignFail {
  type: 'PRESIGN_FAIL';
  err: ApiError;
}

interface MediaValidationError {
  type: 'MEDIA_VALIDATION_ERROR';
  err: MediaError;
}

interface TimeoutError {
  type: 'TIMEOUT';
}

const PRESIGN_TIMEOUT = 2000;
const UPLOAD_TIMEOUT = 10000;

type UploadError = PreSignFail | MediaValidationError | FetchFailError | S3Error | TimeoutError;

export const upload = async (file: File): Promise<Result<{ mediaId: string }, UploadError>> => {
  const validateResult = validateMedia(file);
  if (!validateResult.isOk) {
    return new Err({ type: 'MEDIA_VALIDATION_ERROR', err: validateResult.err });
  }
  const presignPromise = post(
    '/media/presigned',
    { filename: file.name, mimeType: file.type, size: file.size },
    {},
  );
  const presignResult = await Promise.race([presignPromise, timeout(PRESIGN_TIMEOUT)]);
  if (presignResult === 'TIMEOUT') {
    return new Err({ type: 'TIMEOUT' });
  }
  if (!presignResult.isOk) {
    recordError('Failed to get presigned url', { error: presignResult.err });
    return new Err({ type: 'PRESIGN_FAIL', err: presignResult.err });
  }
  const { url, mediaId } = presignResult.some;
  const uploadResult = await Promise.race([uploadImageToS3(file, url), timeout(UPLOAD_TIMEOUT)]);
  if (uploadResult === 'TIMEOUT') {
    return new Err({ type: 'TIMEOUT' });
  }
  if (uploadResult.isErr) return uploadResult;
  return new Ok({ mediaId });
};
