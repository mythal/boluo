import { v1 as uuidV1 } from 'uuid';
import { recordWarning } from '../error-reporting';

const getNodeId = (): Uint8Array => {
  const key = 'client-node-id';
  const serializedId = localStorage.getItem(key);
  if (serializedId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed = JSON.parse(serializedId);
      if (
        Array.isArray(parsed) &&
        parsed.length === 6 &&
        parsed.every((x) => typeof x === 'number')
      ) {
        return new Uint8Array(parsed);
      } else {
        throw new Error('Invalid node ID');
      }
    } catch (e) {
      localStorage.removeItem(key);
      return getNodeId();
    }
  } else {
    const bytes = new Uint8Array(6);
    window.crypto.getRandomValues(bytes);
    const nodeId = Array.from(bytes);
    localStorage.setItem(key, JSON.stringify(nodeId));
    return bytes;
  }
};

export type Id = string;
let node: Uint8Array | undefined;
export const newId = (): Id => uuidV1({ node: (node ??= getNodeId()) });

const ENCODED_UUID_PATTERN = /^[A-Za-z0-9~-]{22}$/;

type RouteIdParameter = 'channel_id' | 'invite_token' | 'space_id' | 'user_id';

interface DecodeUuidOptions {
  parameter?: RouteIdParameter;
}

// Convert a hex string to a byte array
function hexToBytes(hex: string): Uint8Array {
  const bytes = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return new Uint8Array(bytes);
}

// Convert a byte array to a hex string
function bytesToHex(bytes: Uint8Array) {
  const hex = [];
  for (let i = 0; i < bytes.length; i++) {
    const current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    hex.push((current >>> 4).toString(16));
    hex.push((current & 0xf).toString(16));
  }
  return hex.join('');
}

export function encodeUuid(id: Id): string {
  const hex = id.replace(/-/g, '');
  const buffer = hexToBytes(hex);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return (
    base64
      // URL safe characters
      .replace(/\+/g, '-')
      .replace(/\//g, '~')
      // Use base64 to encode uuid, there must be two "=" at the end
      .replace(/=/g, '')
  );
}

export function decodeUuid(s: string, { parameter }: DecodeUuidOptions = {}): Id | undefined {
  if (!ENCODED_UUID_PATTERN.test(s)) {
    return undefined;
  }
  const base64 = s.replace(/-/g, '+').replace(/~/g, '/') + '==';
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    if (bytes.length !== 16) {
      throw new Error('Encoded UUID must decode to 16 bytes');
    }
    const hex = bytesToHex(bytes);
    const timeLow = hex.substr(0, 8);
    const timeMid = hex.substr(8, 4);
    const timeHiAndVersion = hex.substr(12, 4);
    const node = hex.substr(20, 12);
    return `${timeLow}-${timeMid}-${timeHiAndVersion}-${hex.substr(16, 4)}-${node}`;
  } catch {
    return undefined;
  }
}
