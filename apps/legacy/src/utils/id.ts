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
