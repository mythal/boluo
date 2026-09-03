import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeLegacyUuidSegment, legacyHashRedirect } from './legacy-redirect';

const SPACE_ID = '11111111-2222-4333-8444-555555555555';
const CHANNEL_ID = '66666666-7777-4888-8999-aaaaaaaaaaaa';

// Mirrors the pre-migration `apps/legacy` UUID path encoding, to build fixtures.
const encodeLegacyUuid = (uuid: string): string => {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '~').replace(/=/g, '');
};

test('decodeLegacyUuidSegment round-trips an encoded UUID', () => {
  assert.equal(decodeLegacyUuidSegment(encodeLegacyUuid(SPACE_ID)), SPACE_ID);
});

test('decodeLegacyUuidSegment leaves non-encoded segments untouched', () => {
  for (const segment of ['chat', 'settings', '', encodeLegacyUuid(SPACE_ID).slice(0, 21)]) {
    assert.equal(decodeLegacyUuidSegment(segment), segment);
  }
});

test('legacyHashRedirect skips non-GET/HEAD requests', () => {
  const url = new URL('https://boluo.chat/chat/x');
  assert.equal(legacyHashRedirect(new Request(url, { method: 'POST' }), url), null);
});

test('legacyHashRedirect skips the root path', () => {
  const url = new URL('https://boluo.chat/');
  assert.equal(legacyHashRedirect(new Request(url), url), null);
});

test('legacyHashRedirect decodes UUID segments and redirects to the hash route', () => {
  const url = new URL(
    `https://boluo.chat/chat/${encodeLegacyUuid(SPACE_ID)}/${encodeLegacyUuid(CHANNEL_ID)}`,
  );
  const response = legacyHashRedirect(new Request(url), url)!;
  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get('Location'),
    `https://boluo.chat/#/chat/${SPACE_ID}/${CHANNEL_ID}`,
  );
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('legacyHashRedirect redirects plain paths with no encoded segments', () => {
  const url = new URL('https://boluo.chat/settings');
  const response = legacyHashRedirect(new Request(url), url)!;
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), 'https://boluo.chat/#/settings');
});

test('legacyHashRedirect keeps the query string outside the hash', () => {
  const url = new URL('https://boluo.chat/space/new?foo=bar');
  const response = legacyHashRedirect(new Request(url), url)!;
  assert.equal(response.headers.get('Location'), 'https://boluo.chat/?foo=bar#/space/new');
});

test('legacyHashRedirect works for HEAD requests', () => {
  const url = new URL('https://boluo.chat/settings');
  const response = legacyHashRedirect(new Request(url, { method: 'HEAD' }), url)!;
  assert.equal(response.status, 302);
});
