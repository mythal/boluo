import { Id } from '../utils';
import { AppResult, makeUri, request } from './request';

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

export function upload(file: Blob, filename: string, mimeType: string): Promise<AppResult<Media>> {
  return request(makeUri('/media/upload', { filename, mimeType }), 'POST', file, true, mimeType);
}

export function mediaUrl(id: string, download = false): string {
  return makeUri('/media/get', { id, download });
}
