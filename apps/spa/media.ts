import { type FetchFailError, type ApiError, PreSignResult } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { Err, Ok, type Result } from '@boluo/utils/result';
import { timeout } from '@boluo/utils/async';
import { recordError, recordWarn } from './error';

export const mediaMaxSizeMb = 8;
export const mediaMaxSizeByte = mediaMaxSizeMb * 1024 * 1024;

export const supportedImageMediaTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
export const supportedMessageMediaTypes = [...supportedImageMediaTypes, 'application/pdf'];

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
    throw new Error('The public media URL is not valid', { cause: e });
  }
  return url;
};

export function getMediaUrl(mediaPublicUrl: string, mediaId: string): string {
  return `${mediaPublicUrl}/${mediaId}`;
}

async function uploadFileToS3(
  file: File,
  presignedUrl: string,
): Promise<Result<void, S3Error | FetchFailError>> {
  // Use the fetch API to upload the file.
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
    recordWarn('Failed to upload the file to S3', { response });
    return new Err({ type: 'S3_ERROR', err: response });
  }
  return new Ok(undefined);
}

export type MediaError = 'MEDIA_TOO_LARGE' | 'MEDIA_TYPE_NOT_SUPPORTED';

const validateMedia = (
  file: File | string | null | undefined,
  supportedTypes: string[],
): Result<void, MediaError> => {
  if (typeof file === 'string') {
    return new Ok(undefined);
  }
  if (file == null) {
    return new Ok(undefined);
  }
  if (file.size > mediaMaxSizeByte) {
    return new Err('MEDIA_TOO_LARGE');
  }
  if (!supportedTypes.includes(file.type)) {
    return new Err('MEDIA_TYPE_NOT_SUPPORTED');
  }
  return new Ok(undefined);
};

export const validateImageMedia = (
  file: File | string | null | undefined,
): Result<void, MediaError> => validateMedia(file, supportedImageMediaTypes);

export const validateMessageMedia = (
  file: File | string | null | undefined,
): Result<void, MediaError> => validateMedia(file, supportedMessageMediaTypes);

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

export type UploadError =
  PreSignFail | MediaValidationError | FetchFailError | S3Error | TimeoutError;

const TIMEOUT = 'TIMEOUT';

const presign = async (
  file: File,
  supportedTypes: string[],
): Promise<Result<{ url: string; mediaId: string }, UploadError>> => {
  const validateResult = validateMedia(file, supportedTypes);
  if (!validateResult.isOk) {
    return new Err({ type: 'MEDIA_VALIDATION_ERROR', err: validateResult.err });
  }
  const makePresignPromise = () =>
    post('/media/presigned', { filename: file.name, mimeType: file.type, size: file.size }, {});
  const makeTimeoutPromise = () => timeout(PRESIGN_TIMEOUT);

  let presignResult = await Promise.race([makePresignPromise(), makeTimeoutPromise()]);
  if (presignResult === TIMEOUT || !presignResult.isOk) {
    // Retry
    presignResult = await Promise.race([makePresignPromise(), makeTimeoutPromise()]);
  }
  if (presignResult === TIMEOUT) {
    return new Err({ type: TIMEOUT });
  }
  if (presignResult.isErr) {
    return new Err({ type: 'PRESIGN_FAIL', err: presignResult.err });
  }
  const { url, mediaId } = presignResult.some;
  return new Ok({ url, mediaId });
};

const uploadMedia = async (
  file: File,
  supportedTypes: string[],
): Promise<Result<{ mediaId: string }, UploadError>> => {
  const validateResult = validateMedia(file, supportedTypes);
  if (!validateResult.isOk) {
    return new Err({ type: 'MEDIA_VALIDATION_ERROR', err: validateResult.err });
  }
  const presignResult = await presign(file, supportedTypes);
  if (!presignResult.isOk) {
    return new Err(presignResult.err);
  }
  const { url, mediaId } = presignResult.some;
  const uploadResult = await Promise.race([uploadFileToS3(file, url), timeout(UPLOAD_TIMEOUT)]);
  if (uploadResult === TIMEOUT) {
    return new Err({ type: TIMEOUT });
  }
  if (uploadResult.isErr) return uploadResult;
  return new Ok({ mediaId });
};

export const upload = (file: File): Promise<Result<{ mediaId: string }, UploadError>> =>
  uploadMedia(file, supportedImageMediaTypes);

export const uploadMessageMedia = (file: File): Promise<Result<{ mediaId: string }, UploadError>> =>
  uploadMedia(file, supportedMessageMediaTypes);
