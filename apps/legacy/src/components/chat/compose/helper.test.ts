import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppError } from '../../../api/error';
import { Err, Ok } from '../../../utils/result';

const storage = (() => {
  const values = new globalThis.Map<string, string>();
  const localStorageLike: Storage = {
    length: 0,
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  return localStorageLike;
})();

const globalLike = globalThis as typeof globalThis & {
  localStorage?: Storage;
  window?: Window & typeof globalThis;
};
globalLike.localStorage = storage;
globalLike.window = {
  crypto: globalThis.crypto,
  location: { hostname: 'localhost', origin: 'http://localhost' },
} as Window & typeof globalThis;

const { SendTimeoutError, uploadMedia, withTimeout } = await import('./helper');
const { whyCannotSend } = await import('./useOnSend');

test('legacy message validation rejects media without textual content', () => {
  assert.strictEqual(whyCannotSend(false, 'Alice', ''), '内容不能为空');
});

test('legacy uploadMedia keeps an existing media id', async () => {
  const result = await uploadMedia('media-1');

  assert.ok(result.isOk);
  assert.strictEqual(result.value, 'media-1');
});

test('legacy uploadMedia returns upload errors', async () => {
  const error: AppError = {
    code: 'VALIDATION_FAIL',
    message: 'File is too large',
    context: null,
  };
  const file = new File(['image'], 'image.png', { type: 'image/png' });
  const result = await uploadMedia(file, () => Promise.resolve(new Err(error)));

  assert.ok(result.isErr);
  assert.strictEqual(result.value, error);
});

test('legacy uploadMedia converts unexpected rejections to fetch errors', async () => {
  const file = new File(['image'], 'image.png', { type: 'image/png' });
  const result = await uploadMedia(file, () => Promise.reject(new Error('presign failed')));

  assert.ok(result.isErr);
  assert.strictEqual(result.value.code, 'FETCH_FAIL');
  assert.strictEqual(result.value.message, 'presign failed');
});

test('legacy uploadMedia accepts an empty attachment', async () => {
  const result = await uploadMedia(undefined, () =>
    Promise.resolve(new Ok({ mediaId: 'unused' })),
  );

  assert.ok(result.isOk);
  assert.strictEqual(result.value, null);
});

test('legacy send operations reject when they time out', async () => {
  const pending = new Promise<never>(() => undefined);

  await assert.rejects(withTimeout(pending, 1, 'Message send'), (error: unknown) => {
    assert.ok(error instanceof SendTimeoutError);
    assert.strictEqual(error.operation, 'Message send');
    assert.strictEqual(error.timeoutMs, 1);
    return true;
  });
});
