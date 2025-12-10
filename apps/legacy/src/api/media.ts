import { type Id } from '../utils/id';

export interface Media {
  id: Id;
  mimeType: string;
  uploaderId: Id;
  filename: string;
  originalFilename: string;
  hash: string;
  description: string;
  created: number;
}

export interface PreSign {
  filename: string;
  mimeType: string;
  size: number;
}

export interface PreSignResult {
  url: string;
  mediaId: string;
}
