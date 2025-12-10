import { v1 as uuidV1 } from 'uuid';

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
const node = getNodeId();
export const newId = (): Id => uuidV1({ node });

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

export function decodeUuid(s: string): Id {
  const base64 = s.replace(/-/g, '+').replace(/~/g, '/') + '==';
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const hex = bytesToHex(bytes);
    const timeLow = hex.substr(0, 8);
    const timeMid = hex.substr(8, 4);
    const timeHiAndVersion = hex.substr(12, 4);
    const node = hex.substr(20, 12);
    return `${timeLow}-${timeMid}-${timeHiAndVersion}-${hex.substr(16, 4)}-${node}`;
  } catch (e) {
    console.error('Failed to decode id to UUID: ', s);
    return '00000000-0000-0000-0000-000000000000';
  }
}
