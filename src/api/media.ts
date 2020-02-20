import { Id } from '../id';

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
