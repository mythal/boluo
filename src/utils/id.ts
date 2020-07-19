import { v1 as uuidV1 } from 'uuid';

const getNodeId = (): number[] => {
  const key = 'clientNodeId';
  const serializedId = localStorage.getItem(key);
  if (serializedId) {
    try {
      return JSON.parse(serializedId);
    } catch (e) {
      localStorage.removeItem(key);
      return getNodeId();
    }
  } else {
    const bytes = new Uint8Array(6);
    window.crypto.getRandomValues(bytes);
    const nodeId = Array.from(bytes);
    localStorage.setItem(key, JSON.stringify(nodeId));
    return nodeId;
  }
};

export type Id = string;
const node = getNodeId();
export const newId = (): Id => uuidV1({ node });
