import { FETCH_FAIL } from '../../../api/error';
import { type AppResult, uploadWithPresigned } from '../../../api/request';
import { type Id } from '../../../utils/id';
import { Err, Ok } from '../../../utils/result';

type MediaUploader = typeof uploadWithPresigned;

export class SendTimeoutError extends Error {
  constructor(
    public readonly operation: string,
    public readonly timeoutMs: number,
  ) {
    super(`${operation} timed out after ${timeoutMs}ms`);
    this.name = 'SendTimeoutError';
  }
}

export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const handle = globalThis.setTimeout(() => {
      reject(new SendTimeoutError(operation, timeoutMs));
    }, timeoutMs);
    promise.then(
      (value) => {
        globalThis.clearTimeout(handle);
        resolve(value);
      },
      (error: unknown) => {
        globalThis.clearTimeout(handle);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });

export const uploadMedia = async (
  media: File | string | undefined,
  upload: MediaUploader = uploadWithPresigned,
): Promise<AppResult<Id | null>> => {
  if (!media) {
    return new Ok(null);
  }
  if (typeof media === 'string') {
    return new Ok(media);
  }

  try {
    const result = await upload(media, media.name, media.type);
    return result.map(({ mediaId }) => mediaId);
  } catch (error) {
    return new Err({
      code: FETCH_FAIL,
      message: error instanceof Error ? error.message : 'Media upload failed',
      context: null,
    });
  }
};
