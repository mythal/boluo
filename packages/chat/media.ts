import { ApiError } from 'api';
import { post } from 'api-browser';
import { Err, Ok, Result } from 'utils';
import { getConfiguration } from './configuration';

export const mediaMaxSizeMb = 8;
export const mediaMaxSizeByte = mediaMaxSizeMb * 1024 * 1024;

export const supportedMediaType = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

interface S3Error {
  type: 'S3_ERROR';
  err: Response;
}

export const makeMeidaPublicUrl = (raw: unknown) => {
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

const getMediaPublicUrl = () => {
  const url = getConfiguration().mediaUrl;
  if (url == null) {
    throw new Error('PUBLIC_MEDIA_URL is not defined');
  }
  return url;
};

export function getMediaUrl(mediaId: string): string {
  const mediaPublicUrl = getMediaPublicUrl();
  return `${mediaPublicUrl}/${mediaId}`;
}

async function uploadImageToS3(file: File, presignedUrl: string): Promise<Result<void, S3Error>> {
  // Use the fetch API to upload the image
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!response.ok) {
    console.warn('failed to upload image to s3', response);
    return new Err({ type: 'S3_ERROR', err: response });
  }
  return new Ok(undefined);
}

export type MediaError = 'MEDIA_TOO_LARGE' | 'MEDIA_TYPE_NOT_SUPPORTED';

export const validateMedia = (file: File | null): Result<void, MediaError> => {
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

type UploadError = PreSignFail | MediaValidationError | S3Error;

export const upload = async (
  file: File,
): Promise<Result<{ mediaId: string }, UploadError>> => {
  const validateResult = validateMedia(file);
  if (!validateResult.isOk) {
    return new Err({ type: 'MEDIA_VALIDATION_ERROR', err: validateResult.err });
  }
  const presignResult = await post(
    '/media/presigned',
    { filename: file.name, mimeType: file.type, size: file.size },
    {},
  );
  if (!presignResult.isOk) {
    console.warn('failed to get presigned url', presignResult.err);
    return new Err({ type: 'PRESIGN_FAIL', err: presignResult.err });
  }
  const { url, mediaId } = presignResult.some;
  const uploadResult = await uploadImageToS3(file, url);
  if (uploadResult.isErr) return uploadResult;
  return new Ok({ mediaId });
};
